/**
 * Análise de qualidade de frame: nitidez via Variance of Laplacian,
 * calculada em escala de cinza sobre o canvas da ROI.
 * Score 0..100.
 */
export function computeSharpness(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return 0
  const { width, height } = canvas
  if (width < 8 || height < 8) return 0

  const img = ctx.getImageData(0, 0, width, height)
  const data = img.data

  // Escala de cinza
  const gray = new Float32Array(width * height)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }

  // Laplaciano 3x3: [0,1,0; 1,-4,1; 0,1,0]
  let sum = 0
  let sumSq = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const v =
        -4 * gray[i] +
        gray[i - 1] +
        gray[i + 1] +
        gray[i - width] +
        gray[i + width]
      sum += v
      sumSq += v * v
      count++
    }
  }
  const mean = sum / count
  const variance = sumSq / count - mean * mean

  // Mapeia variance para 0..100 (empírico: variance>500 já é nítido).
  const score = Math.min(100, Math.round((variance / 500) * 100))
  return score
}
