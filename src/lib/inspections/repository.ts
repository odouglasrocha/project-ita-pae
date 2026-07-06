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

  const payload: Record<string, unknown> = {
    status: result.aprovado ? "APROVADO" : "REPROVADO",
    aprovado: result.aprovado,
    ea: parsed?.ea ?? null,
    ls: parsed?.ls ?? null,
    data_validade: parsed?.data ?? null,
    hora: parsed?.hora ?? null,
    producao: producaoISO,
    ocr_raw: ocrRaw || null,
    ocr_confidence: Math.round(ocrConfidence),
    sharpness,
    expected_ls: expectedLS,
    expected_expiration: expectedExpiration,
  }

  const { data, error } = await supabase
    .from("inspection_results")
    .insert(payload)
    .select("id")
    .single()

  if (error || !data?.id) {
    console.error("[inspections] insert parent failed", error)
    return null
  }

  const fieldsPayload = result.campos.map((c) => ({
    inspection_id: data.id,
    field_name: c.campo,
    expected_value: c.esperado,
    found_value: c.encontrado,
    status: c.status,
  }))

  const { error: fieldsErr } = await supabase.from("inspection_result_fields").insert(fieldsPayload)
  if (fieldsErr) console.error("[inspections] insert fields failed", fieldsErr)

  return data.id
}

function normalizeInspectionRow(row: Record<string, unknown>): InspectionRow {
  return {
    id: String(row.id ?? ""),
    created_at: String(row.created_at ?? ""),
    status: String((row.status as string | undefined) ?? (row.result_summary as string | undefined) ?? ""),
    aprovado: Boolean((row.aprovado as boolean | undefined) ?? (row.approved as boolean | undefined) ?? false),
    ea: (row.ea as string | null | undefined) ?? (row.parsed_ea as string | null | undefined) ?? null,
    ls: (row.ls as string | null | undefined) ?? (row.parsed_ls as string | null | undefined) ?? null,
    data_validade:
      (row.data_validade as string | null | undefined) ??
      (row.parsed_data as string | null | undefined) ??
      (row.expiration_date as string | null | undefined) ??
      null,
    hora: (row.hora as string | null | undefined) ?? (row.parsed_hour as string | null | undefined) ?? null,
    producao:
      (row.producao as string | null | undefined) ??
      (row.production_date as string | null | undefined) ??
      null,
    ocr_raw: (row.ocr_raw as string | null | undefined) ?? (row.raw_text as string | null | undefined) ?? null,
    ocr_confidence: typeof row.ocr_confidence === "number" ? row.ocr_confidence : null,
    sharpness: typeof row.sharpness === "number" ? row.sharpness : null,
    expected_ls: (row.expected_ls as string | null | undefined) ?? (row.julian_code as string | null | undefined) ?? null,
    expected_expiration:
      (row.expected_expiration as string | null | undefined) ??
      (row.expiration_date as string | null | undefined) ??
      null,
  }
}

function normalizeInspectionFields(inspectionId: string, row: Record<string, unknown>): InspectionFieldRow[] {
  const rawFields = row.fields
  if (rawFields && typeof rawFields === "object" && !Array.isArray(rawFields)) {
    return Object.entries(rawFields as Record<string, Record<string, unknown>>).map(([fieldName, value], index) => ({
      id: `${inspectionId}-${index}`,
      inspection_id: inspectionId,
      field_name: fieldName,
      expected_value: value?.esperado as string | null | undefined,
      found_value: value?.encontrado as string | null | undefined,
      status: String(value?.status ?? "ok"),
      created_at: String(row.created_at ?? ""),
    }))
  }

  return []
}

export async function listInspections(limit = 100): Promise<InspectionRow[]> {
  const { data, error } = await supabase.from("inspection_results").select("*").order("created_at", { ascending: false }).limit(limit)
  if (error) {
    console.error("[inspections] list failed", error)
    return []
  }

  return (data ?? []).map((row) => normalizeInspectionRow(row as Record<string, unknown>))
}

export async function getInspectionFields(inspectionId: string): Promise<InspectionFieldRow[]> {
  const { data, error } = await supabase
    .from("inspection_result_fields")
    .select("*")
    .eq("inspection_id", inspectionId)
    .order("created_at", { ascending: true })

  if (!error && (data?.length ?? 0) > 0) {
    return (data ?? []) as InspectionFieldRow[]
  }

  const { data: inspectionData, error: parentError } = await supabase
    .from("inspection_results")
    .select("id, fields, created_at")
    .eq("id", inspectionId)
    .single()

  if (parentError || !inspectionData) {
    console.error("[inspections] fields failed", error ?? parentError)
    return []
  }

  return normalizeInspectionFields(inspectionId, inspectionData as Record<string, unknown>)
}
