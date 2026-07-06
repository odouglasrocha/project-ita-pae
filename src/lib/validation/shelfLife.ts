import { SHELF_LIFE_DIAS } from "@/data/ShelfLifeWeekly"

/**
 * Regra oficial de âncora (segunda-feira do lote):
 *  - Segunda (1) a Sábado (6): âncora = SEGUNDA da MESMA semana.
 *  - Domingo (0): âncora = SEGUNDA da PRÓXIMA semana.
 *
 * Ou seja, a validade "troca" para a próxima semana automaticamente
 * assim que o relógio passa 00:00 de domingo.
 *
 * Validade = âncora + SHELF_LIFE_DIAS (168 dias).
 */
export function getAnchorMonday(prodDate: Date): Date {
  const d = new Date(prodDate.getFullYear(), prodDate.getMonth(), prodDate.getDate())
  const dow = d.getDay() // 0=Domingo, 1=Segunda, ..., 6=Sábado
  // Domingo -> +1 dia (segunda seguinte); Seg..Sáb -> volta até a segunda da semana.
  const offset = dow === 0 ? 1 : 1 - dow
  d.setDate(d.getDate() + offset)
  return d
}

export function computeExpirationDate(prodDate: Date): Date {
  const anchor = getAnchorMonday(prodDate)
  const exp = new Date(anchor)
  exp.setDate(exp.getDate() + SHELF_LIFE_DIAS)
  return exp
}

export function formatDateBR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0")
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const yy = String(date.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

export function formatDateISO(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}
