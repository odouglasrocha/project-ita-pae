/**
 * Pré-processamento avançado de ROI para OCR em embalagens ESCURAS
 * (chocolate, plásticos metalizados, marrons, pretos).
 *
 * Estratégia (não destrói a versão original — é aplicada em um canvas separado):
 *   1) Grayscale ponderado.
 *   2) Auto contrast stretch (2%..98% percentis) — remove clareamento/queimado.
 *   3) Correção de gamma adaptativa (imagens muito escuras ganham gamma < 1).
 *   4) Unsharp mask leve para reforçar bordas da impressão.
 *   5) Threshold adaptativo (Sauvola-lite via média/desvio local em janela).
 *   6) Inversão automática se o fundo ficar predominantemente preto — o
 *      Tesseract lê muito melhor texto escuro em fundo branco.
 *
 * Retorna um NOVO canvas para não interferir na análise de nitidez que já
 * roda sobre o canvas base.
 */

export interface LuminanceStats {
  mean: number
  std: number
  isDark: boolean
  isLowContrast: boolean
}

export function analyzeLuminance(canvas: HTMLCanvasElement): LuminanceStats {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return { mean: 128, std: 40, isDark: false, isLowContrast: false }
  const { width, height } = canvas
  const img = ctx.getImageData(0, 0, width, height).data
  let sum = 0
  let sumSq = 0
  const n = width * height
  for (let i = 0; i < img.length; i += 4) {
    const g = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]
    sum += g
    sumSq += g * g
  }
  const mean = sum / n
  const variance = sumSq / n - mean * mean
  const std = Math.sqrt(Math.max(0, variance))
  return {
    mean,
    std,
    isDark: mean < 110,
    isLowContrast: std < 45,
  }
}

/**
 * Gera um canvas otimizado para OCR em superfícies escuras.
 * Não modifica o canvas de entrada.
 */
export function enhanceForDarkOCR(source: HTMLCanvasElement): HTMLCanvasElement {
  const w = source.width
  const h = source.height
  const out = document.createElement("canvas")
  out.width = w
  out.height = h
  const octx = out.getContext("2d", { willReadFrequently: true })!
  const sctx = source.getContext("2d", { willReadFrequently: true })!
  const src = sctx.getImageData(0, 0, w, h)
  const data = src.data

  // 1) Grayscale
  const gray = new Uint8ClampedArray(w * h)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  // 2) Auto contrast stretch (2%..98%)
  const hist = new Uint32Array(256)
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++
  const total = gray.length
  const lowCut = total * 0.02
  const highCut = total * 0.98
  let acc = 0
  let lo = 0
  for (let i = 0; i < 256; i++) {
    acc += hist[i]
    if (acc >= lowCut) {
      lo = i
      break
    }
  }
  acc = 0
  let hi = 255
  for (let i = 0; i < 256; i++) {
    acc += hist[i]
    if (acc >= highCut) {
      hi = i
      break
    }
  }
  if (hi <= lo) hi = lo + 1
  const scale = 255 / (hi - lo)
  for (let i = 0; i < gray.length; i++) {
    const v = (gray[i] - lo) * scale
    gray[i] = v < 0 ? 0 : v > 255 ? 255 : v
  }

  // 3) Gamma adaptativo (mean baixo → gamma < 1 clareia)
  let sum = 0
  for (let i = 0; i < gray.length; i++) sum += gray[i]
  const mean = sum / gray.length
  const gamma = mean < 90 ? 0.55 : mean < 130 ? 0.75 : 1.0
  if (gamma !== 1.0) {
    const lut = new Uint8ClampedArray(256)
    for (let i = 0; i < 256; i++) lut[i] = Math.round(255 * Math.pow(i / 255, gamma))
    for (let i = 0; i < gray.length; i++) gray[i] = lut[gray[i]]
  }

  // 4) Unsharp mask leve (blur 3x3 e reforço)
  const blur = boxBlur3(gray, w, h)
  const AMOUNT = 0.9
  const sharpened = new Uint8ClampedArray(gray.length)
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i] + AMOUNT * (gray[i] - blur[i])
    sharpened[i] = v < 0 ? 0 : v > 255 ? 255 : v
  }

  // 5) Threshold adaptativo (Sauvola-lite) com janela 25x25
  const win = 25
  const half = Math.floor(win / 2)
  const integral = buildIntegral(sharpened, w, h)
  const integralSq = buildIntegralSq(sharpened, w, h)
  const R = 128
  const k = 0.34
  const bin = new Uint8ClampedArray(gray.length)
  let whiteCount = 0
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half)
    const y1 = Math.min(h - 1, y + half)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half)
      const x1 = Math.min(w - 1, x + half)
      const area = (x1 - x0 + 1) * (y1 - y0 + 1)
      const s = boxSum(integral, w, x0, y0, x1, y1)
      const sq = boxSum(integralSq, w, x0, y0, x1, y1)
      const m = s / area
      const variance = sq / area - m * m
      const stdev = Math.sqrt(Math.max(0, variance))
      const T = m * (1 + k * (stdev / R - 1))
      const px = sharpened[y * w + x]
      const on = px > T ? 255 : 0
      bin[y * w + x] = on
      if (on === 255) whiteCount++
    }
  }

  // 6) Inversão automática se muito fundo escuro
  const whiteRatio = whiteCount / bin.length
  const invert = whiteRatio < 0.4

  const outData = octx.createImageData(w, h)
  const od = outData.data
  for (let i = 0, j = 0; i < bin.length; i++, j += 4) {
    const v = invert ? 255 - bin[i] : bin[i]
    od[j] = od[j + 1] = od[j + 2] = v
    od[j + 3] = 255
  }
  octx.putImageData(outData, 0, 0)
  return out
}

function boxBlur3(src: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0
      let count = 0
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          if (xx < 0 || xx >= w) continue
          sum += src[yy * w + xx]
          count++
        }
      }
      out[y * w + x] = sum / count
    }
  }
  return out
}

function buildIntegral(src: Uint8ClampedArray, w: number, h: number): Float64Array {
  const I = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      rowSum += src[y * w + x]
      I[(y + 1) * (w + 1) + (x + 1)] = I[y * (w + 1) + (x + 1)] + rowSum
    }
  }
  return I
}

function buildIntegralSq(src: Uint8ClampedArray, w: number, h: number): Float64Array {
  const I = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      const v = src[y * w + x]
      rowSum += v * v
      I[(y + 1) * (w + 1) + (x + 1)] = I[y * (w + 1) + (x + 1)] + rowSum
    }
  }
  return I
}

function boxSum(I: Float64Array, w: number, x0: number, y0: number, x1: number, y1: number): number {
  const W = w + 1
  return (
    I[(y1 + 1) * W + (x1 + 1)] -
    I[y0 * W + (x1 + 1)] -
    I[(y1 + 1) * W + x0] +
    I[y0 * W + x0]
  )
}
