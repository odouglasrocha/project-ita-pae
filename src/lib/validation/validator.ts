import { getJulianCodeForDate } from "@/data/CodigoJuliano"
import { computeExpirationDate, formatDateBR } from "./shelfLife"
import type { ParsedPrint } from "./parser"

export type FieldStatus = "ok" | "erro" | "ausente"

export interface FieldResult {
  campo: string
  esperado: string | null
  encontrado: string | null
  status: FieldStatus
}

export interface ValidationResult {
  aprovado: boolean
  producao: Date
  campos: FieldResult[]
}

export interface ValidationInput {
  parsed: ParsedPrint
  producao: Date // data de produção de referência (default: hoje)
}

export function validatePrint({ parsed, producao }: ValidationInput): ValidationResult {
  const campos: FieldResult[] = []

  // 1. Data de Validade esperada = shelf life a partir da produção
  const expectedExpiration = computeExpirationDate(producao)
  const expectedExpirationStr = formatDateBR(expectedExpiration)
  campos.push({
    campo: "Data de Validade",
    esperado: expectedExpirationStr,
    encontrado: parsed.data ?? null,
    status: !parsed.data
      ? "ausente"
      : parsed.data === expectedExpirationStr
        ? "ok"
        : "erro",
  })

  // 2. Código Juliano esperado = getJulianCodeForDate(produção)
  const expectedLS = getJulianCodeForDate(producao)
  campos.push({
    campo: "Código Juliano (LS)",
    esperado: expectedLS,
    encontrado: parsed.ls ?? null,
    status: !parsed.ls
      ? "ausente"
      : parsed.ls === expectedLS
        ? "ok"
        : "erro",
  })

  // 3. EA e Hora — apenas presença (não há regra de conteúdo)
  campos.push({
    campo: "EA",
    esperado: null,
    encontrado: parsed.ea ?? null,
    status: parsed.ea ? "ok" : "ausente",
  })
  campos.push({
    campo: "Hora",
    esperado: null,
    encontrado: parsed.hora ?? null,
    status: parsed.hora ? "ok" : "ausente",
  })

  const aprovado = campos.every((c) => c.status === "ok")
  return { aprovado, producao, campos }
}
