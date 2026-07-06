export interface ShelfLifeDay {
  date: string // yyyy-MM-dd
  dayOfWeek: string
  julianCode: string
  expirationDate: string // yyyy-MM-dd
  daysUntilExpiration: number
}

export interface ShelfLifeWeeklyTable {
  description: string
  currentDate: string
  currentJulianCode: string
  baseExpiration: string
  weekData: ShelfLifeDay[]
}

// Quantidade de dias de shelf life (segunda base -> validade).
export const SHELF_LIFE_DIAS = 168

export const ShelfLifeWeekly: ShelfLifeWeeklyTable = {
  description: "Tabela semanal de segunda a domingo",
  currentDate: "2025-08-11",
  currentJulianCode: "LS223",
  baseExpiration: "2026-01-26",
  weekData: [
    { date: "2025-08-11", dayOfWeek: "Segunda", julianCode: "LS223", expirationDate: "2026-01-26", daysUntilExpiration: 168 },
    { date: "2025-08-12", dayOfWeek: "Terça", julianCode: "LS224", expirationDate: "2026-01-26", daysUntilExpiration: 167 },
    { date: "2025-08-13", dayOfWeek: "Quarta", julianCode: "LS225", expirationDate: "2026-01-26", daysUntilExpiration: 166 },
    { date: "2025-08-14", dayOfWeek: "Quinta", julianCode: "LS226", expirationDate: "2026-01-26", daysUntilExpiration: 165 },
    { date: "2025-08-15", dayOfWeek: "Sexta", julianCode: "LS227", expirationDate: "2026-01-26", daysUntilExpiration: 164 },
    { date: "2025-08-16", dayOfWeek: "Sábado", julianCode: "LS228", expirationDate: "2026-01-26", daysUntilExpiration: 163 },
    { date: "2025-08-17", dayOfWeek: "Domingo", julianCode: "LS229", expirationDate: "2026-02-02", daysUntilExpiration: 169 },
  ],
}

export const DIAS_SEMANA_PT = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
]
