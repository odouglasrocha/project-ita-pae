import { createFileRoute, Link } from "@tanstack/react-router"
import { Fragment, useEffect, useState } from "react"

import {
  getInspectionFields,
  listInspections,
  fetchInspectionHistory,
  type InspectionFieldRow,
  type InspectionRow,
} from "@/lib/inspections/repository"

export const Route = createFileRoute("/history")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Histórico — InspectorLS" },
      { name: "description", content: "Histórico de inspeções salvas." },
    ],
  }),
  component: HistoryPage,
})

function HistoryPage() {
  const [rows, setRows] = useState<InspectionRow[] | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, InspectionFieldRow[]>>({})
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchList() {
      try {
        const r = await fetchInspectionHistory(200)
        if (mounted) {
          if (Array.isArray(r) && r.length === 0) {
            // tenta fallback quando não há registros pai
            try {
              const { listInspectionsWithFallback } = await import("@/lib/inspections/repository")
              const fallback = await listInspectionsWithFallback(200)
              setRows(fallback)
            } catch (fallbackErr) {
              setRows([])
            }
          } else {
            setRows(r)
          }
          setErr(null)
        }
      } catch (e) {
        if (mounted) setErr((e as Error).message)
      }
    }

    fetchList()

    // ouvindo notificações de salvar para atualizar automaticamente
    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel("inspections")
      bc.onmessage = (ev) => {
        const payload = ev.data as any
        if (payload?.type === "saved") {
          fetchList()
        }
      }
    } catch {
      // BroadcastChannel pode não estar disponível — não é fatal
    }

    return () => {
      mounted = false
      if (bc) bc.close()
    }
  }, [])

  const toggle = async (id: string) => {
    if (expanded === id) {
      setExpanded(null)
      return
    }
    setExpanded(id)
    if (!fields[id]) {
      // verifica se a linha já inclui nested fields (evita chamada extra)
      const row = rows?.find((r) => r.id === id) as (InspectionRow & { inspection_result_fields?: InspectionFieldRow[] }) | undefined
      if (row && row.inspection_result_fields) {
        setFields((prev) => ({ ...prev, [id]: row.inspection_result_fields ?? [] }))
        return
      }
      const f = await getInspectionFields(id)
      setFields((prev) => ({ ...prev, [id]: f }))
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-mono text-sm text-muted-foreground hover:text-foreground">
            ← InspectorLS
          </Link>
          <Link
            to="/scanner"
            className="text-mono text-xs uppercase tracking-widest text-primary hover:underline"
          >
            Scanner
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-bold">Histórico de Inspeções</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registros salvos automaticamente após cada captura completa.
        </p>

        {err && (
          <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">EA</th>
                <th className="px-3 py-2">LS</th>
                <th className="px-3 py-2">Validade</th>
                <th className="px-3 py-2">Hora</th>
                <th className="px-3 py-2">OCR conf</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows === null && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {rows?.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                    Nenhuma inspeção salva ainda.
                  </td>
                </tr>
              )}
              {rows?.length > 0 && rows[0].status === "ORPHANED" && (
                <tr>
                  <td colSpan={8} className="px-3 py-3 text-center text-muted-foreground">
                    Há registros de campos no banco, mas faltam registros pai em `inspection_results`.
                    Exibindo itens encontrados em `inspection_result_fields`.
                  </td>
                </tr>
              )}
              {rows?.map((r) => (
                <Fragment key={r.id}>
                  <tr key={r.id} className="border-t border-border">
                    <td className="text-mono px-3 py-2 text-xs">
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          "text-mono rounded px-2 py-0.5 text-[10px] font-bold " +
                          (r.aprovado
                            ? "bg-success text-success-foreground"
                            : "bg-destructive text-destructive-foreground")
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="text-mono px-3 py-2">{r.ea ?? "—"}</td>
                    <td className="text-mono px-3 py-2">{r.ls ?? "—"}</td>
                    <td className="text-mono px-3 py-2">{r.data_validade ?? "—"}</td>
                    <td className="text-mono px-3 py-2">{r.hora ?? "—"}</td>
                    <td className="text-mono px-3 py-2 text-xs text-muted-foreground">
                      {r.ocr_confidence ?? 0}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => toggle(r.id)}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-accent"
                      >
                        {expanded === r.id ? "Fechar" : "Detalhes"}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={r.id + "-details"} className="border-t border-border bg-card/40">
                      <td colSpan={8} className="px-3 py-3">
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="rounded border border-border bg-background/40 p-2">
                            <div className="text-[10px] uppercase text-muted-foreground">OCR bruto</div>
                            <div className="text-mono break-all text-xs">{r.ocr_raw ?? "—"}</div>
                          </div>
                          <div className="rounded border border-border bg-background/40 p-2">
                            <div className="text-[10px] uppercase text-muted-foreground">Esperado</div>
                            <div className="text-mono text-xs">
                              LS {r.expected_ls ?? "—"} · Validade {r.expected_expiration ?? "—"}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1">
                          {(fields[r.id] ?? []).map((f) => (
                            <div
                              key={f.id}
                              className="flex items-center justify-between rounded border border-border bg-background/40 px-3 py-1.5 text-xs"
                            >
                              <div>
                                <span className="text-muted-foreground">{f.field_name}: </span>
                                <span className="text-mono">{f.found_value ?? "—"}</span>
                                {f.expected_value && f.status === "erro" && (
                                  <span className="text-muted-foreground"> · esp {f.expected_value}</span>
                                )}
                              </div>
                              <span
                                className={
                                  "text-mono rounded px-2 py-0.5 text-[10px] font-bold " +
                                  (f.status === "ok"
                                    ? "bg-success text-success-foreground"
                                    : f.status === "erro"
                                      ? "bg-destructive text-destructive-foreground"
                                      : "bg-muted text-muted-foreground")
                                }
                              >
                                {f.status.toUpperCase()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
