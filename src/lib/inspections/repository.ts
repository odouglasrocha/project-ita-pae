import { supabase } from "@/lib/supabase/client"
import type { ValidationResult } from "@/lib/validation/validator"
import type { ParsedPrint } from "@/lib/validation/parser"

export interface SaveInspectionInput {
  parsed: ParsedPrint | null
  result: ValidationResult
  ocrRaw: string
  ocrConfidence: number
  sharpness: number
  expectedLS: string | null
  expectedExpiration: string
  producaoISO: string
}

export interface InspectionRow {
  id: string
  created_at: string
  status: string
  aprovado: boolean
  ea: string | null
  ls: string | null
  data_validade: string | null
  hora: string | null
  producao: string | null
  ocr_raw: string | null
  ocr_confidence: number | null
  sharpness: number | null
  expected_ls: string | null
  expected_expiration: string | null
}

// suporte a nested fields quando a query traz `inspection_result_fields(*)`
export interface InspectionRowWithFields extends InspectionRow {
  inspection_result_fields?: InspectionFieldRow[]
}

export interface InspectionFieldRow {
  id: string
  inspection_id: string
  field_name: string
  expected_value: string | null
  found_value: string | null
  status: string
  created_at: string
}

/**
 * Saves an inspection + its field breakdown into the `pae` Supabase project.
 * Tables: public.inspection_results (parent) + public.inspection_result_fields (child).
 * Best-effort insert — falls back gracefully if some columns don't exist upstream.
 */
export async function saveInspection(input: SaveInspectionInput): Promise<string | null> {
  const { parsed, result, ocrRaw, ocrConfidence, sharpness, expectedLS, expectedExpiration, producaoISO } = input

  // Monta payload tentando cobrir múltiplos nomes de coluna que podem existir
  const payload: Record<string, unknown> = {
    // normalized / english-ish
    production_date: producaoISO,
    julian_code: expectedLS,
    expiration_date: expectedExpiration,
    approved: result.aprovado,
    raw_text: ocrRaw || null,
    parsed_data: parsed?.data ?? null,
    parsed_ls: parsed?.ls ?? null,
    parsed_ea: parsed?.ea ?? null,
    parsed_hour: parsed?.hora ?? null,
    ocr_confidence: Math.round(ocrConfidence),
    sharpness,
    result_summary: result.aprovado ? "Aprovado" : "Reprovado",

    // backward-compatible / pt-BR names
    status: result.aprovado ? "APROVADO" : "REPROVADO",
    aprovado: result.aprovado,
    ea: parsed?.ea ?? null,
    ls: parsed?.ls ?? null,
    data_validade: parsed?.data ?? null,
    hora: parsed?.hora ?? null,
    producao: producaoISO,
    ocr_raw: ocrRaw || null,
    expected_ls: expectedLS,
    expected_expiration: expectedExpiration,
  }

  try {
    const { data, error } = await supabase
      .from("inspection_results")
      .insert(payload)
      .select("id")
      .single()

    if (error) {
      console.error("[inspections] insert parent failed", error)
      throw new Error(error.message ?? "Failed to insert inspection_results")
    }
    if (!data || !data.id) {
      console.error("[inspections] insert parent returned no id", data)
      throw new Error("Insert returned no id")
    }

    const fieldsPayload = result.campos.map((c) => ({
      inspection_id: data.id,
      field_name: c.campo,
      expected_value: c.esperado,
      found_value: c.encontrado,
      status: c.status,
    }))

    const { error: fieldsErr } = await supabase.from("inspection_result_fields").insert(fieldsPayload)
    if (fieldsErr) {
      console.error("[inspections] insert fields failed — rolling back parent", fieldsErr)
      // tentativa de evitar registros órfãos: remove o pai se os filhos falharem
      try {
        const { error: delErr } = await supabase.from("inspection_results").delete().eq("id", data.id)
        if (delErr) console.error("[inspections] rollback delete parent failed", delErr)
      } catch (delEx) {
        console.error("[inspections] rollback delete parent exception", delEx)
      }
      throw new Error(fieldsErr.message ?? "Failed to insert inspection_result_fields")
    }

    return data.id
  } catch (ex) {
    console.error("[inspections] saveInspection unexpected error", ex)
    throw ex instanceof Error ? ex : new Error("Unknown saveInspection error")
  }
}

export async function listInspections(limit = 100): Promise<InspectionRow[]> {
  const { data, error } = await supabase
    .from("inspection_results")
    .select("*, inspection_result_fields(*)")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) {
    console.error("[inspections] list failed", error)
    throw new Error(error.message ?? "Failed to list inspection_results")
  }
  const rows = (data ?? []) as any[]
  function normalize(r: any): InspectionRow {
    const approved = r.approved ?? r.aprovado ?? r.approved_value ?? false
    const statusStr = typeof r.result_summary === "string" && r.result_summary.trim()
      ? r.result_summary
      : typeof r.status === "string" && r.status.trim()
        ? r.status
        : approved === true
          ? "APROVADO"
          : approved === false
            ? "REPROVADO"
            : ""

    const ea = r.parsed_ea ?? r.ea ?? r.parsedEA ?? null
    const ls = r.parsed_ls ?? r.ls ?? r.julian_code ?? r.julian ?? null
    const data_validade = r.parsed_data ?? r.data_validade ?? r.expiration_date ?? null
    const hora = r.parsed_hour ?? r.hora ?? r.parsedHora ?? null
    const ocr_raw = r.raw_text ?? r.ocr_raw ?? r.rawText ?? null
    const ocr_confidence = (r.ocr_confidence ?? r.ocrConfidence) != null ? Number(r.ocr_confidence ?? r.ocrConfidence) : null

    const mapped: InspectionRow = {
      id: String(r.id ?? ""),
      created_at: String(r.created_at ?? new Date().toISOString()),
      status: String(statusStr ?? ""),
      aprovado: !!approved,
      ea: ea ?? null,
      ls: ls ?? null,
      data_validade: data_validade ?? null,
      hora: hora ?? null,
      producao: (r.production_date ?? r.producao) ?? null,
      ocr_raw: ocr_raw ?? null,
      ocr_confidence: ocr_confidence,
      sharpness: r.sharpness ?? null,
      expected_ls: r.expected_ls ?? r.julian_code ?? null,
      expected_expiration: r.expected_expiration ?? r.expiration_date ?? null,
    }

    // attach nested fields if present (preserve original shape)
    if (Array.isArray(r.inspection_result_fields)) {
      ;(mapped as InspectionRowWithFields).inspection_result_fields = r.inspection_result_fields as InspectionFieldRow[]
    }

    return mapped
  }

  return rows.map(normalize)
}

/**
 * Fallback: se não houver linhas em inspection_results, constrói linhas
 * a partir das inspection_result_fields existentes (caso haja registros órfãos).
 */
export async function listInspectionsWithFallback(limit = 100): Promise<InspectionRow[]> {
  const rows = await listInspections(limit)
  if (rows.length > 0) return rows

  // sem pais — tenta construir a lista a partir dos campos
  const { data, error } = await supabase
    .from("inspection_result_fields")
    .select("inspection_id, field_name, expected_value, found_value, status, created_at")
    .order("created_at", { ascending: false })
    .limit(1000)

  if (error) {
    console.error("[inspections] fallback fields query failed", error)
    return []
  }
  const fields = (data ?? []) as Array<Record<string, any>>
  const map = new Map<string, Array<Record<string, any>>>()
  for (const f of fields) {
    const id = String(f.inspection_id ?? "")
    if (!id) continue
    if (!map.has(id)) map.set(id, [])
    map.get(id)!.push(f)
  }

  const synthetic: InspectionRow[] = []
  for (const [inspection_id, fls] of map) {
    // usa o campo mais recente como referência
    const latest = fls[0]
    const row: InspectionRow = {
      id: inspection_id,
      created_at: latest.created_at ?? new Date().toISOString(),
      status: "ORPHANED",
      aprovado: false,
      ea: null,
      ls: null,
      data_validade: null,
      hora: null,
      producao: null,
      ocr_raw: null,
      ocr_confidence: null,
      sharpness: null,
      expected_ls: null,
      expected_expiration: null,
    }
    // preenche com informações encontradas nos campos (busca por nomes conhecidos)
    for (const f of fls) {
      const rawName = String(f.field_name ?? "")
      const name = rawName
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
      const val = f.found_value ?? f.expected_value ?? null
      if (!val) continue
      if (name.includes("ea")) row.ea = String(val)
      if (name.includes("jul") || name.includes("juliano") || name.includes("codigo") || name.includes("ls")) row.ls = String(val)
      if (name.includes("valid") || name.includes("data")) row.data_validade = String(val)
      if (name.includes("hora")) row.hora = String(val)
      if (!row.ocr_raw && (f.found_value || f.expected_value)) row.ocr_raw = String(f.found_value ?? f.expected_value)
    }
    synthetic.push(row)
    if (synthetic.length >= limit) break
  }
  return synthetic
}

export async function fetchInspectionHistory(limit = 100): Promise<InspectionRowWithFields[]> {
  const { data, error } = await supabase
    .from("inspection_results")
    .select("*, inspection_result_fields(*)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[inspections] fetchInspectionHistory failed", error)
    throw error
  }

  const rows = (data ?? []) as any[]
  // normalize using same rules as listInspections
  const normalized = rows.map((r) => {
    const base = r as any
    const approved = base.approved ?? base.aprovado ?? false
    const statusStr = typeof base.result_summary === "string" && base.result_summary.trim()
      ? base.result_summary
      : typeof base.status === "string" && base.status.trim()
        ? base.status
        : approved === true
          ? "APROVADO"
          : approved === false
            ? "REPROVADO"
            : ""

    const mapped: InspectionRowWithFields = {
      id: String(base.id ?? ""),
      created_at: String(base.created_at ?? new Date().toISOString()),
      status: String(statusStr ?? ""),
      aprovado: !!approved,
      ea: base.parsed_ea ?? base.ea ?? null,
      ls: base.parsed_ls ?? base.ls ?? base.julian_code ?? null,
      data_validade: base.parsed_data ?? base.data_validade ?? base.expiration_date ?? null,
      hora: base.parsed_hour ?? base.hora ?? null,
      producao: base.production_date ?? base.producao ?? null,
      ocr_raw: base.raw_text ?? base.ocr_raw ?? null,
      ocr_confidence: (base.ocr_confidence ?? null) as number | null,
      sharpness: base.sharpness ?? null,
      expected_ls: base.expected_ls ?? base.julian_code ?? null,
      expected_expiration: base.expected_expiration ?? base.expiration_date ?? null,
      inspection_result_fields: Array.isArray(base.inspection_result_fields)
        ? (base.inspection_result_fields as InspectionFieldRow[])
        : undefined,
    }
    return mapped
  })
  return normalized
}

export async function getInspectionFields(inspectionId: string): Promise<InspectionFieldRow[]> {
  const { data, error } = await supabase
    .from("inspection_result_fields")
    .select("*")
    .eq("inspection_id", inspectionId)
    .order("created_at", { ascending: true })
  if (error) {
    console.error("[inspections] fields failed", error)
    throw new Error(error.message ?? "Failed to get inspection_result_fields")
  }
  return (data ?? []) as InspectionFieldRow[]
}
