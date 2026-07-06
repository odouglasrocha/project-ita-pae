export interface CodigoJulianoRow {
  Dia: number
  [coluna: string]: string | number
}

// Dias por mês em um ano padrão (não-bissexto), conforme a planilha de referência.
const DIAS_POR_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function pad3(n: number): string {
  return String(n).padStart(3, "0")
}

// Constrói a tabela {Dia, Col1..Col12} idêntica à referência.
function construirTabela(): CodigoJulianoRow[] {
  const linhas: CodigoJulianoRow[] = []
  for (let dia = 1; dia <= 31; dia++) {
    const linha: CodigoJulianoRow = { Dia: dia }
    let acumulado = 0
    for (let mes = 0; mes < 12; mes++) {
      const diasNoMes = DIAS_POR_MES[mes]
      if (dia <= diasNoMes) {
        const diaDoAno = acumulado + dia
        linha[`Col${mes + 1}`] = `LS${pad3(diaDoAno)}`
      }
      acumulado += diasNoMes
    }
    linhas.push(linha)
  }
  return linhas
}

export const CodigoJuliano: CodigoJulianoRow[] = construirTabela()

/**
 * Consulta o código juliano (LS) correspondente a uma data.
 * Sempre lê da tabela CodigoJuliano — não realiza cálculo direto de dia do ano.
 */
export function getJulianCodeForDate(date: Date): string | null {
  const dia = date.getDate()
  const mes = date.getMonth() + 1 // 1..12
  const linha = CodigoJuliano.find((l) => l.Dia === dia)
  if (!linha) return null
  const valor = linha[`Col${mes}`]
  return typeof valor === "string" ? valor : null
}
