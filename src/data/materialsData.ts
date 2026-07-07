export interface Material {
  Codigo: string
  Material: string
  Gramagem: string
  Und: number
  Caixas: number
  PPm: number
}

export const MATERIAL_FAMILIES = ["Torcida", "Fofura"] as const
export type MaterialFamily = (typeof MATERIAL_FAMILIES)[number]

export type TurnoName = "1º Turno" | "2º Turno" | "3º Turno"

export interface TurnoDefinition {
  label: TurnoName
  inicio: string
  fim: string
  horas: number
}

export const TURNOS: Record<TurnoName, TurnoDefinition> = {
  "1º Turno": {
    label: "1º Turno",
    inicio: "05:30",
    fim: "13:50",
    horas: 8.3333,
  },
  "2º Turno": {
    label: "2º Turno",
    inicio: "13:50",
    fim: "22:08",
    horas: 8.3,
  },
  "3º Turno": {
    label: "3º Turno",
    inicio: "22:08",
    fim: "05:30",
    horas: 7.3667,
  },
}

export const materialsData: Material[] = [
  { Codigo: "300061751", Material: "TORCIDA BACON 35GX26 PP", Gramagem: "0,035", Und: 26, Caixas: 150, PPm: 65 },
  { Codigo: "300061782", Material: "FOFURA BACON 35GX26 PP", Gramagem: "0,035", Und: 26, Caixas: 150, PPm: 75 },
  { Codigo: "300061783", Material: "FOFURA BACON 60GX24 PP", Gramagem: "0,060", Und: 24, Caixas: 135, PPm: 75 },
  { Codigo: "300061784", Material: "FOFURA CHURRASCO 35GX26 PP", Gramagem: "0,035", Und: 26, Caixas: 150, PPm: 75 },
  { Codigo: "300061750", Material: "TORCIDA BACON 60GX24 PP", Gramagem: "0,060", Und: 24, Caixas: 135, PPm: 65 },
  { Codigo: "300061635", Material: "TORCIDA BACON 420GX16 PP", Gramagem: "0,420", Und: 16, Caixas: 16, PPm: 30 },
  { Codigo: "300061778", Material: "TORCIDA CHURRASCO 60GX24 PP", Gramagem: "0,060", Und: 24, Caixas: 135, PPm: 75 },
  { Codigo: "300061779", Material: "TORCIDA CHURRASCO 35GX26 PP", Gramagem: "0,035", Und: 26, Caixas: 150, PPm: 75 },
  { Codigo: "300047936", Material: "TORCIDA CHURRASCO 100GX27", Gramagem: "0,100", Und: 27, Caixas: 49, PPm: 65 },
  { Codigo: "300061633", Material: "TORCIDA CHURRASCO 120GX28 PP", Gramagem: "0,120", Und: 28, Caixas: 49, PPm: 65 },
  { Codigo: "300061777", Material: "TORCIDA COSTELA 35GX26 PP", Gramagem: "0,035", Und: 26, Caixas: 150, PPm: 75 },
  { Codigo: "300061776", Material: "TORCIDA COSTELA 60GX24 PP", Gramagem: "0,060", Und: 24, Caixas: 135, PPm: 75 },
  { Codigo: "300061775", Material: "TORCIDA PAO DE ALHO 35GX26 PP", Gramagem: "0,035", Und: 26, Caixas: 150, PPm: 75 },
  { Codigo: "300061774", Material: "TORCIDA PAO DE ALHO 60GX24 PP", Gramagem: "0,060", Und: 24, Caixas: 135, PPm: 75 },
  { Codigo: "300056662", Material: "TORCIDA PAO DE ALHO 100GX27", Gramagem: "0,100", Und: 27, Caixas: 49, PPm: 65 },
  { Codigo: "300061773", Material: "TORCIDA PIMENTA MEX 35GX26 PP", Gramagem: "0,035", Und: 26, Caixas: 150, PPm: 75 },
  { Codigo: "300061772", Material: "TORCIDA PIMENTA MEX 60GX24 PP", Gramagem: "0,060", Und: 24, Caixas: 135, PPm: 75 },
  { Codigo: "300047932", Material: "TORCIDA PIMENTA MEXICANA 100GX27", Gramagem: "0,100", Und: 27, Caixas: 49, PPm: 65 },
  { Codigo: "300061632", Material: "TORCIDA PIMENTA MEX 120GX28 PP", Gramagem: "0,120", Und: 28, Caixas: 49, PPm: 65 },
  { Codigo: "300061631", Material: "TORCIDA PIMENTA MEX 420GX16 PP", Gramagem: "0,420", Und: 16, Caixas: 21, PPm: 30 },
  { Codigo: "300061771", Material: "TORCIDA QUEIJO 35GX26 PP", Gramagem: "0,035", Und: 26, Caixas: 150, PPm: 75 },
  { Codigo: "300061770", Material: "TORCIDA QUEIJO 60GX24 PP", Gramagem: "0,060", Und: 24, Caixas: 135, PPm: 75 },
  { Codigo: "300047935", Material: "TORCIDA QUEIJO 100GX27", Gramagem: "0,100", Und: 27, Caixas: 49, PPm: 65 },
  { Codigo: "300061539", Material: "TORCIDA VINAGRETE 35GX26 PP", Gramagem: "0,035", Und: 26, Caixas: 150, PPm: 75 },
  { Codigo: "300061538", Material: "TORCIDA VINAGRETE 60GX24 PP", Gramagem: "0,060", Und: 24, Caixas: 135, PPm: 75 },
  { Codigo: "300058009", Material: "TORCIDA VINAGRETE 100GX27", Gramagem: "0,100", Und: 27, Caixas: 49, PPm: 65 },
  { Codigo: "300047934", Material: "TORCIDA CEBOLA 100GX27", Gramagem: "0,100", Und: 27, Caixas: 49, PPm: 65 },
  { Codigo: "300061725", Material: "TORCIDA CEBOLA 60GX24 PP", Gramagem: "0,060", Und: 24, Caixas: 135, PPm: 75 },
  { Codigo: "300061634", Material: "TORCIDA CEBOLA 420GX16 PP", Gramagem: "0,420", Und: 16, Caixas: 21, PPm: 30 },
  { Codigo: "300061727", Material: "TORCIDA CEBOLA 35GX26 PP", Gramagem: "0,035", Und: 26, Caixas: 150, PPm: 75 },
  { Codigo: "300047931", Material: "TORCIDA CAMARAO COM PIMENTA 100GX27", Gramagem: "0,100", Und: 27, Caixas: 49, PPm: 65 },
  { Codigo: "300061728", Material: "TORCIDA CAMARAO 60GX24 PP", Gramagem: "0,060", Und: 24, Caixas: 135, PPm: 75 },
  { Codigo: "300061729", Material: "TORCIDA CAMARAO 35GX26 PP", Gramagem: "0,035", Und: 26, Caixas: 150, PPm: 75 },
  { Codigo: "300062190", Material: "TORCIDA CX MISTA PIM E CHUR 60GX24X1", Gramagem: "0,060", Und: 24, Caixas: 135, PPm: 75 },
  { Codigo: "300062005", Material: "TORCIDA PIM MEXICANA 210GX20 PP", Gramagem: "0,210", Und: 20, Caixas: 42, PPm: 55 },
  { Codigo: "300062006", Material: "TORCIDA CHURRASCO 210GX20 PP", Gramagem: "0,210", Und: 20, Caixas: 42, PPm: 55 },
]

export const LINHAS_PRODUCAO = ["Linha 1", "Linha 2", "Linha 3", "Linha 4", "Linha 5"]

export function getMaterialFamily(material: Material): MaterialFamily {
  const normalizedName = material.Material.toUpperCase()

  if (normalizedName.includes("FOFURA")) {
    return "Fofura"
  }

  if (normalizedName.includes("TORCIDA")) {
    return "Torcida"
  }

  return "Torcida"
}

export function getMaterialsByFamily(family: MaterialFamily): Material[] {
  return materialsData.filter((material) => getMaterialFamily(material) === family)
}

export function calculateMeta85(ppm: number, turno: TurnoName): number {
  if (!ppm || !turno) {
    return 0
  }

  return Number(((ppm * 60 * TURNOS[turno].horas) * 0.85).toFixed(2))
}

export function findMaterialByCodigo(codigo: string): Material | undefined {
  return materialsData.find((m) => m.Codigo === codigo.trim())
}
