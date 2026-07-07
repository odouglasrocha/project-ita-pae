import { createFileRoute, Link } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"

import { getJulianCodeForDate } from "@/data/CodigoJuliano"
import { computeExpirationDate, formatDateBR, formatDateISO } from "@/lib/validation/shelfLife"
import { parsePrint, type ParsedPrint } from "@/lib/validation/parser"
import { validatePrint, type ValidationResult } from "@/lib/validation/validator"
import { recognizeCanvas, terminateOcr } from "@/lib/ocr/tesseract"
import { computeSharpness } from "@/lib/vision/quality"
import { analyzeLuminance, enhanceForDarkOCR } from "@/lib/vision/preprocess"
import { ApprovedProductionForm } from "@/components/scanner/ApprovedProductionForm"
import { saveInspection } from "@/lib/inspections/repository"

export const Route = createFileRoute("/scanner")({
  // Câmera + Tesseract precisam do browser: desliga SSR nesta rota.
  ssr: false,
  head: () => ({
    meta: [
      { title: "Scanner — InspectorLS" },
      { name: "description", content: "Scanner contínuo de impressão industrial." },
    ],
  }),
  component: ScannerPage,
})

type Phase =
  | "idle"
  | "starting"
  | "searching"
  | "adjusting"
  | "sharp"
  | "recognizing"
  | "validated"
  | "error"

const PHASE_LABELS: Record<Phase, string> = {
  idle: "Aguardando câmera",
  starting: "🔍 Iniciando câmera…",
  searching: "🔍 Procurando impressão…",
  adjusting: "🟡 Ajustando foco…",
  sharp: "🟢 Impressão localizada",
  recognizing: "🟢 Executando OCR",
  validated: "🟢 Inspeção concluída",
  error: "🔴 Erro",
}

const SHARPNESS_THRESHOLD = 55
const OCR_INTERVAL_MS = 700

function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const roiCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastOcrAtRef = useRef<number>(0)
  const busyRef = useRef<boolean>(false)
  const lastSignatureRef = useRef<string>("")
  const savedRef = useRef<boolean>(false)

  const [phase, setPhase] = useState<Phase>("idle")
  const [sharpness, setSharpness] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [ocrRaw, setOcrRaw] = useState<string>("")
  const [ocrConfidence, setOcrConfidence] = useState<number>(0)
  const [parsed, setParsed] = useState<ParsedPrint | null>(null)
  const [result, setResult] = useState<ValidationResult | null>(null)
  const [prodDateISO, setProdDateISO] = useState<string>(formatDateISO(new Date()))
  const [torchOn, setTorchOn] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [savingMsg, setSavingMsg] = useState<string | null>(null)

  const prodDate = new Date(prodDateISO + "T00:00:00")
  const expectedLS = getJulianCodeForDate(prodDate)
  const expectedExp = computeExpirationDate(prodDate)

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setPhase("idle")
  }, [])

  const start = useCallback(async () => {
    setErrorMsg(null)
    setPhase("starting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()

      const track = stream.getVideoTracks()[0]
      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
        torch?: boolean
      }
      setTorchAvailable(Boolean(caps.torch))

      setPhase("searching")
      loop()
    } catch (err) {
      setErrorMsg((err as Error).message)
      setPhase("error")
    }
  }, [])

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet & { torch: boolean }],
      })
      setTorchOn(next)
    } catch {
      /* torch não suportado */
    }
  }, [torchOn])

  const loop = useCallback(() => {
    const step = async () => {
      const video = videoRef.current
      const canvas = roiCanvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(step)
        return
      }

      // Recorta ROI central (~60% largura, 18% altura) com zoom digital ~2x.
      const vw = video.videoWidth
      const vh = video.videoHeight
      const roiW = vw * 0.6
      const roiH = vh * 0.18
      const sx = (vw - roiW) / 2
      const sy = (vh - roiH) / 2

      const targetW = 900
      const targetH = Math.round((roiH / roiW) * targetW)
      canvas.width = targetW
      canvas.height = targetH

      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) {
        rafRef.current = requestAnimationFrame(step)
        return
      }
      ctx.drawImage(video, sx, sy, roiW, roiH, 0, 0, targetW, targetH)

      // Pré-processamento simples: escala de cinza + contraste
      const img = ctx.getImageData(0, 0, targetW, targetH)
      const d = img.data
      for (let i = 0; i < d.length; i += 4) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        // aumenta contraste
        const c = Math.min(255, Math.max(0, (g - 128) * 1.4 + 128))
        d[i] = d[i + 1] = d[i + 2] = c
      }
      ctx.putImageData(img, 0, 0)

      const score = computeSharpness(canvas)
      setSharpness(score)

      const now = performance.now()
      if (
        score >= SHARPNESS_THRESHOLD &&
        !busyRef.current &&
        now - lastOcrAtRef.current > OCR_INTERVAL_MS
      ) {
        setPhase("recognizing")
        busyRef.current = true
        lastOcrAtRef.current = now
        try {
          // Passe 1 — canvas base (mantém pipeline atual)
          const first = await recognizeCanvas(canvas)
          let text = first.text
          let confidence = first.confidence
          let p = parsePrint(text)

          // Passe 2 (dark boost) — só quando faltam campos ou a superfície é escura/baixo contraste.
          const lum = analyzeLuminance(canvas)
          const missing = !(p.data && p.ls && p.ea && p.hora)
          if (missing || lum.isDark || lum.isLowContrast) {
            try {
              const enhanced = enhanceForDarkOCR(canvas)
              const second = await recognizeCanvas(enhanced)
              const p2 = parsePrint(second.text)
              const merged: ParsedPrint = {
                raw: `${p.raw}\n${p2.raw}`,
                cleaned: p.cleaned || p2.cleaned,
                data: p.data ?? p2.data,
                dateObj: p.dateObj ?? p2.dateObj,
                ls: p.ls ?? p2.ls,
                julianNumber: p.julianNumber ?? p2.julianNumber,
                ea: p.ea ?? p2.ea,
                hora: p.hora ?? p2.hora,
              }
              const countFilled = (x: ParsedPrint) =>
                Number(Boolean(x.data)) + Number(Boolean(x.ls)) + Number(Boolean(x.ea)) + Number(Boolean(x.hora))
              const filledBefore = countFilled(p)
              const filledAfter = countFilled(merged)
              // Só usa o texto/confiança do 2º passe se ele efetivamente ajudou.
              if (filledAfter > filledBefore || (filledAfter === filledBefore && second.confidence > confidence)) {
                text = `${first.text}\n${second.text}`
                confidence = Math.max(confidence, second.confidence)
              }
              p = merged
            } catch {
              /* enhancement é best-effort — jamais quebra o loop */
            }
          }

          setOcrRaw(text)
          setOcrConfidence(confidence)
          setParsed(p)
          if (p.data || p.ls) {
            const sig = `${p.data ?? ""}|${p.ls ?? ""}|${p.ea ?? ""}|${p.hora ?? ""}`
            if (sig !== lastSignatureRef.current) {
              lastSignatureRef.current = sig
              const r = validatePrint({ parsed: p, producao: prodDate })
              setResult(r)
              setPhase("validated")
              // feedback vibração
              if (navigator.vibrate) navigator.vibrate(r.aprovado ? 60 : [80, 60, 80])

              // Captura completa: todos os 4 campos presentes → para câmera e salva no histórico
              const complete = Boolean(p.data && p.ls && p.ea && p.hora)
              if (complete && !savedRef.current) {
                savedRef.current = true
                setSavingMsg("Salvando inspeção…")
                stop()
                try {
                  let id: string | null = null
                  if (import.meta.env.PROD) {
                    // envia para o endpoint server-side que usa a service role key
                    const res = await fetch('/api/save-inspection', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        parsed: p,
                        result: r,
                        ocrRaw: text,
                        ocrConfidence: confidence,
                        sharpness: score,
                        expectedLS,
                        expectedExpiration: formatDateISO(expectedExp),
                        producaoISO: prodDateISO,
                      }),
                    })
                    if (!res.ok) {
                      const txt = await res.text()
                      throw new Error(`Server error ${res.status} ${txt}`)
                    }
                    const body = await res.json()
                    id = body?.id ?? null
                  } else {
                    id = await saveInspection({
                      parsed: p,
                      result: r,
                      ocrRaw: text,
                      ocrConfidence: confidence,
                      sharpness: score,
                      expectedLS,
                      expectedExpiration: formatDateISO(expectedExp),
                      producaoISO: prodDateISO,
                    })
                  }

                  setSavedId(id)
                  setSavingMsg(id ? "Inspeção salva no histórico." : "Falha ao salvar inspeção.")
                  if (id) {
                    try {
                      const bc = new BroadcastChannel("inspections")
                      bc.postMessage({ type: "saved", id })
                      bc.close()
                    } catch {
                      // ignore
                    }
                  }
                } catch (e) {
                  setSavingMsg("Falha ao salvar: " + (e as Error).message)
                }
              }
            } else {
              setPhase("sharp")
            }
          } else {
            setPhase("searching")
          }
        } catch (err) {
          setErrorMsg((err as Error).message)
        } finally {
          busyRef.current = false
        }
      } else if (score >= SHARPNESS_THRESHOLD) {
        setPhase((p) => (p === "recognizing" || p === "validated" ? p : "sharp"))
      } else {
        setPhase((p) =>
          p === "recognizing" || p === "validated" ? p : score > 25 ? "adjusting" : "searching",
        )
      }

      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [prodDate])

  useEffect(() => {
    return () => {
      stop()
      terminateOcr().catch(() => {})
    }
  }, [stop])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-mono text-sm text-muted-foreground hover:text-foreground">
            ← InspectorLS
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/history" className="text-mono text-xs uppercase tracking-widest text-primary hover:underline">
              Histórico
            </Link>
            <div className="text-mono text-xs uppercase tracking-widest text-muted-foreground">
              {PHASE_LABELS[phase]}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-5">
        {/* Câmera */}
        <section className="lg:col-span-3">
          <div className="relative overflow-hidden rounded-lg border border-border bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-[3/4] w-full object-cover md:aspect-video"
            />
            {/* Overlay ROI */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="relative border-2 border-primary/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                style={{ width: "60%", height: "18%" }}
              >
                <div className="absolute inset-x-0 top-1/2 h-px scan-line opacity-70" />
                <div className="absolute -top-6 left-0 text-mono text-xs text-primary">
                  ROI
                </div>
                <div className="absolute -top-6 right-0 text-mono text-xs text-primary">
                  {sharpness}%
                </div>
              </div>
            </div>
            {phase === "idle" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <button
                  onClick={start}
                  className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Iniciar câmera
                </button>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {phase !== "idle" && (
              <button
                onClick={stop}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
              >
                Parar
              </button>
            )}
            {torchAvailable && (
              <button
                onClick={toggleTorch}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent"
              >
                Torch: {torchOn ? "ON" : "OFF"}
              </button>
            )}
            {savedRef.current && (
              <button
                onClick={() => {
                  savedRef.current = false
                  lastSignatureRef.current = ""
                  setSavedId(null)
                  setSavingMsg(null)
                  setResult(null)
                  setParsed(null)
                  setOcrRaw("")
                  start()
                }}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              >
                Nova inspeção
              </button>
            )}
            <div className="ml-auto text-mono text-xs text-muted-foreground">
              Nitidez {sharpness}% · OCR conf {Math.round(ocrConfidence)}%
            </div>
          </div>

          {savingMsg && (
            <div className="mt-3 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
              {savingMsg}
              {savedId && (
                <>
                  {" · "}
                  <Link to="/history" className="underline">
                    ver histórico
                  </Link>
                </>
              )}
            </div>
          )}

          <canvas ref={roiCanvasRef} className="mt-3 w-full max-w-md rounded border border-border" />
          {errorMsg && (
            <div className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errorMsg}
            </div>
          )}
        </section>

        {/* Painel de validação */}
        <aside className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Data de produção
            </div>
            <input
              type="date"
              value={prodDateISO}
              onChange={(e) => setProdDateISO(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">LS esperado</div>
                <div className="text-mono text-primary">{expectedLS ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Validade esperada</div>
                <div className="text-mono text-primary">{formatDateBR(expectedExp)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
              OCR bruto
            </div>
            <div className="text-mono min-h-6 break-all text-xs text-muted-foreground">
              {ocrRaw || "—"}
            </div>
            {parsed && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Field label="Data" value={parsed.data} />
                <Field label="LS" value={parsed.ls} />
                <Field label="EA" value={parsed.ea} />
                <Field label="Hora" value={parsed.hora} />
              </div>
            )}
          </div>

          {result && (
            <div
              className={
                "rounded-lg border p-4 " +
                (result.aprovado
                  ? "border-success/60 bg-success/10"
                  : "border-destructive/60 bg-destructive/10")
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    Resultado
                  </div>
                  {result.aprovado && (
                    <ApprovedProductionForm
                      prefill={{
                        ea: parsed?.ea ?? undefined,
                        ls: parsed?.ls ?? expectedLS ?? undefined,
                        shelfLife: formatDateBR(expectedExp),
                        dataSelecionada: formatDateBR(prodDate),
                      }}
                    />
                  )}
                </div>
                <div
                  className={
                    "text-mono text-lg font-bold " +
                    (result.aprovado ? "text-success" : "text-destructive")
                  }
                >
                  {result.aprovado ? "APROVADO" : "REPROVADO"}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {result.campos.map((c) => (
                  <div
                    key={c.campo}
                    className="flex items-center justify-between rounded border border-border bg-background/40 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="text-xs text-muted-foreground">{c.campo}</div>
                      <div className="text-mono">
                        {c.encontrado ?? "—"}
                        {c.esperado && c.status === "erro" && (
                          <span className="text-muted-foreground"> · esp {c.esperado}</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded border border-border bg-background/40 px-2 py-1">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="text-mono text-sm">{value ?? "—"}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: "ok" | "erro" | "ausente" }) {
  const map = {
    ok: { c: "bg-success text-success-foreground", l: "OK" },
    erro: { c: "bg-destructive text-destructive-foreground", l: "ERRO" },
    ausente: { c: "bg-muted text-muted-foreground", l: "—" },
  } as const
  const s = map[status]
  return (
    <span className={"text-mono rounded px-2 py-0.5 text-[10px] font-bold " + s.c}>
      {s.l}
    </span>
  )
}
