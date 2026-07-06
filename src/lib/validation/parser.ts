/**
 * Correções contextuais: OCR frequentemente confunde letras/números.
 * Aplicamos por posição: em contexto numérico O→0, I→1, S→5, B→8, Z→2.
 * Em contexto de letras próximo ao LS: 5→S, 1→I, 0→O.
 */
function normalizeNumeric(s: string): string {
  return s
    .replace(/O/g, "0")
    .replace(/o/g, "0")
    .replace(/I/gi, "1")
    .replace(/l/g, "1")
    .replace(/B/g, "8")
    .replace(/Z/g, "2")
    .replace(/S/g, "5")
}

export function sanitizeOcr(raw: string): string {
  // Remove tudo exceto dígitos, /, :, L, S
  return raw
    .toUpperCase()
    .replace(/[^0-9/:LS]/g, "")
    .trim()
}

export interface ParsedPrint {
  raw: string
  cleaned: string
  data?: string // DD/MM/YY
  dateObj?: Date
  ls?: string // LS + 3 dígitos
  julianNumber?: number
  ea?: string // 2 dígitos
  hora?: string // HH:MM
}

/**
 * Interpreta padrões como:
 *   14/12/26LS1824214:55
 *   16/11/26LS1821908:02
 * Formato: DD/MM/YY LS + JJJ (juliano 3d) + EA (2d) + HH:MM
 */
export function parsePrint(raw: string): ParsedPrint {
  const cleaned = sanitizeOcr(raw)
  const result: ParsedPrint = { raw, cleaned }

  // Regex tolerante: aceita ausência de separadores extras.
  const re = /(\d{2})\/(\d{2})\/(\d{2})\s*L\s*S\s*(\d{3})(\d{2})\s*(\d{2}):(\d{2})/
  const m = cleaned.match(re)
  if (!m) {
    // Tenta separar em blocos mesmo com ruído
    return tryLooseParse(cleaned, result)
  }

  const [, dd, mm, yy, jjj, ea, hh, mi] = m
  result.data = `${dd}/${mm}/${yy}`
  result.dateObj = new Date(2000 + Number(yy), Number(mm) - 1, Number(dd))
  result.ls = `LS${jjj}`
  result.julianNumber = Number(jjj)
  result.ea = ea
  result.hora = `${hh}:${mi}`
  return result
}

function tryLooseParse(cleaned: string, result: ParsedPrint): ParsedPrint {
  // Data no início
  const dateMatch = cleaned.match(/^(\d{2})\/(\d{2})\/(\d{2})/)
  if (dateMatch) {
    const [, dd, mm, yy] = dateMatch
    result.data = `${dd}/${mm}/${yy}`
    result.dateObj = new Date(2000 + Number(yy), Number(mm) - 1, Number(dd))
  }

  // LS + 3 dígitos
  const lsMatch = cleaned.match(/LS(\d{3})/)
  if (lsMatch) {
    result.ls = `LS${lsMatch[1]}`
    result.julianNumber = Number(lsMatch[1])

    // Após o LS+juliano, tentar EA (2d) e hora (HH:MM)
    const after = cleaned.slice(cleaned.indexOf(lsMatch[0]) + lsMatch[0].length)
    const tail = after.match(/^(\d{2})(\d{2}):(\d{2})/)
    if (tail) {
      const [, ea, hh, mi] = tail
      result.ea = ea
      result.hora = `${hh}:${mi}`
    } else {
      // Tenta só a hora
      const hourOnly = after.match(/(\d{2}):(\d{2})/)
      if (hourOnly) result.hora = `${hourOnly[1]}:${hourOnly[2]}`
    }
  }

  return result
}

// Utilitário de correção quando sabemos que a região deve ser numérica.
export { normalizeNumeric }
