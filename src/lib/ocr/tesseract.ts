import { createWorker, type Worker } from "tesseract.js"

let workerPromise: Promise<Worker> | null = null

/**
 * Worker singleton do Tesseract com whitelist restrita ao domínio da impressão
 * industrial: dígitos, /, :, L, S.
 */
export function getOcrWorker(): Promise<Worker> {
  if (workerPromise) return workerPromise
  workerPromise = (async () => {
    const worker = await createWorker("eng", 1, {
      // Baixa binário do CDN oficial — evita bundling de assets pesados no worker edge.
      logger: () => {},
    })
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789/:LS",
      preserve_interword_spaces: "0",
    })
    return worker
  })()
  return workerPromise
}

export async function recognizeCanvas(canvas: HTMLCanvasElement): Promise<{
  text: string
  confidence: number
}> {
  const worker = await getOcrWorker()
  const { data } = await worker.recognize(canvas)
  return { text: data.text ?? "", confidence: data.confidence ?? 0 }
}

export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return
  const w = await workerPromise
  await w.terminate()
  workerPromise = null
}
