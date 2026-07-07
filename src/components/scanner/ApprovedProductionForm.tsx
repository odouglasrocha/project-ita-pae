import { useMemo, useState } from "react"
import { ClipboardCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  calculateMeta85,
  findMaterialByCodigo,
  getMaterialsByFamily,
  MATERIAL_FAMILIES,
  TURNOS,
  type MaterialFamily,
  type TurnoName,
} from "@/data/materialsData"

export interface ProductionFormPrefill {
  ea?: string
  ls?: string
  shelfLife?: string // dd/mm/aa (validade calculada)
  dataSelecionada?: string // dd/mm/aaaa exibida ao usuário
}

interface Props {
  prefill: ProductionFormPrefill
  triggerAriaLabel?: string
}

const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const MINUTOS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

function TimePicker({ id }: { id: string }) {
  return (
    <div className="flex gap-2">
      <Select>
        <SelectTrigger id={`${id}-h`} className="w-20">
          <SelectValue placeholder="00" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {HORAS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select>
        <SelectTrigger id={`${id}-m`} className="w-20">
          <SelectValue placeholder="00" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {MINUTOS.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function ApprovedProductionForm({ prefill, triggerAriaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [familia, setFamilia] = useState<MaterialFamily | "">("")
  const [turno, setTurno] = useState<TurnoName | "">("")
  const [produtoCodigo, setProdutoCodigo] = useState("")
  const [ppm, setPpm] = useState("")
  const [meta85, setMeta85] = useState("")

  const produtos = useMemo(() => (familia ? getMaterialsByFamily(familia) : []), [familia])
  const turnoOptions = Object.keys(TURNOS) as TurnoName[]

  const handleFamiliaChange = (value: string) => {
    setFamilia(value as MaterialFamily)
    setProdutoCodigo("")
    setPpm("")
    setMeta85("")
  }

  const handleProdutoChange = (value: string) => {
    setProdutoCodigo(value)

    const material = findMaterialByCodigo(value)
    if (!material) {
      setPpm("")
      setMeta85("")
      return
    }

    setPpm(String(material.PPm))

    if (!turno) {
      setMeta85("")
      return
    }

    setMeta85(String(calculateMeta85(material.PPm, turno)))
  }

  const handleTurnoChange = (value: string) => {
    const nextTurno = value as TurnoName
    setTurno(nextTurno)

    if (!produtoCodigo) {
      setMeta85("")
      return
    }

    const material = findMaterialByCodigo(produtoCodigo)
    if (!material) {
      setMeta85("")
      return
    }

    setMeta85(String(calculateMeta85(material.PPm, nextTurno)))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={triggerAriaLabel ?? "Abrir formulário de produção"}
          title="Abrir formulário de produção"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-success/60 bg-success/15 text-success transition hover:bg-success/25"
        >
          <ClipboardCheck className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto p-0">
        <div className="border-b border-border bg-card px-4 py-3">
          <DialogHeader>
            <DialogTitle className="text-base">
              {prefill.ea ? `${prefill.ea} Torcida` : "EA — Torcida"}
            </DialogTitle>
          </DialogHeader>
        </div>

        <form className="space-y-4 px-4 py-4 text-sm">
          <Row>
            <Field label="Família">
              <SimpleSelect
                placeholder="Selecione"
                options={MATERIAL_FAMILIES}
                value={familia}
                onValueChange={handleFamiliaChange}
              />
            </Field>
            <Field label="Turno">
              <SimpleSelect
                placeholder="Turno"
                options={turnoOptions}
                value={turno}
                onValueChange={handleTurnoChange}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Produto">
              <SimpleSelect
                placeholder="Selecione o produto"
                options={produtos.map((produto) => produto.Codigo)}
                optionLabels={produtos.map((produto) => produto.Material)}
                value={produtoCodigo}
                onValueChange={handleProdutoChange}
                disabled={!familia}
              />
            </Field>
            <Field label="Ppm">
              <Input type="number" value={ppm} placeholder="" readOnly />
            </Field>
            <Field label="Minuto">
              <Input type="number" placeholder="" />
            </Field>
          </Row>

          <Field label="Meta 85%">
            <Input type="number" value={meta85} placeholder="" readOnly />
          </Field>

          <Row>
            <Field label="H Início">
              <TimePicker id="hini" />
            </Field>
            <Field label="H Final">
              <TimePicker id="hfim" />
            </Field>
          </Row>

          <Row>
            <Field label="Bolsas produzidas">
              <Input type="number" />
            </Field>
            <Field label="Eficiência da EA">
              <Input type="number" step="0.01" />
            </Field>
            <Field label="Filme Perdas (kg)">
              <Input type="number" step="0.01" />
            </Field>
            <Field label="Lote">
              <Input defaultValue={prefill.ls ?? ""} readOnly />
            </Field>
          </Row>

          <Row>
            <Field label="Motivo da perda de filme">
              <SimpleSelect
                placeholder="Selecione"
                options={["Emenda", "Ajuste inicial", "Quebra", "Outros"]}
              />
            </Field>
            <Field label="Eficiência da balança">
              <Input type="number" step="0.01" />
            </Field>
            <Field label="Overpack (g)">
              <Input type="number" step="0.01" />
            </Field>
          </Row>

          <Field label="Tipo Parada">
            <SimpleSelect placeholder="Selecione" options={["Programada", "Não programada"]} />
          </Field>

          <Row>
            <Field label="Downtime">
              <TimePicker id="dwt" />
            </Field>
            <Field label="Tempo DWT [min]">
              <Input type="number" />
            </Field>
            <Field label="Eficiência DWT (%)">
              <Input type="number" step="0.01" />
            </Field>
          </Row>

          <Row>
            <Field label="Downtime Área">
              <SimpleSelect placeholder="Selecione" options={["EA", "Envase", "Utilidades"]} />
            </Field>
            <Field label="Downtime Equipamento">
              <SimpleSelect placeholder="Selecione" options={["EA35", "EA36", "Balança"]} />
            </Field>
            <Field label="Observações">
              <Textarea rows={2} />
            </Field>
          </Row>

          <Field label="Downtime Motivo">
            <SimpleSelect
              placeholder="Selecione"
              options={["Falha mecânica", "Falha elétrica", "Setup", "Limpeza"]}
            />
          </Field>

          {/* Campos "invisíveis" na imagem mas exigidos pelo requisito: EA / ShelfLife / LS auto-preenchidos */}
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              Dados da inspeção (auto)
            </div>
            <Row>
              <Field label="EA">
                <Input defaultValue={prefill.ea ?? ""} readOnly />
              </Field>
              <Field label="ShelfLife">
                <Input defaultValue={prefill.shelfLife ?? ""} readOnly />
              </Field>
              <Field label="LS">
                <Input defaultValue={prefill.ls ?? ""} readOnly />
              </Field>
            </Row>
          </div>

          <div>
            <Label className="text-xs">Fotos</Label>
            <div className="mt-1 text-xs text-muted-foreground">
              Qtd img: 0
              <br />
              Data selecionada: {prefill.dataSelecionada ?? "—"}
            </div>
            <div className="mt-2 flex gap-2">
              <Button type="button" variant="outline" size="sm">
                Abrir câmera
              </Button>
              <Button type="button" variant="outline" size="sm">
                Escolher arquivo
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm">
                Home
              </Button>
              <Button type="button" variant="outline" size="sm">
                Photo
              </Button>
            </div>
            <Button
              type="button"
              className="bg-foreground text-background hover:bg-foreground/90"
              onClick={() => setOpen(false)}
            >
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-foreground">{label}</Label>
      {children}
    </div>
  )
}

function SimpleSelect({
  placeholder,
  options,
  optionLabels,
  value,
  onValueChange,
  disabled = false,
}: {
  placeholder: string
  options: readonly string[]
  optionLabels?: readonly string[]
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option, index) => (
          <SelectItem key={option} value={option}>
            {optionLabels?.[index] ?? option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
