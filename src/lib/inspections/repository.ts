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

export async function listInspections(limit = 100): Promise<InspectionRow[]> {
  const { data, error } = await supabase
    .from("inspection_results")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) {
    console.error("[inspections] list failed", error)
    return []
  }
  return (data ?? []) as InspectionRow[]
}

export async function getInspectionFields(inspectionId: string): Promise<InspectionFieldRow[]> {
  const { data, error } = await supabase
    .from("inspection_result_fields")
    .select("*")
    .eq("inspection_id", inspectionId)
    .order("created_at", { ascending: true })
  if (error) {
    console.error("[inspections] fields failed", error)
    return []
  }
  return (data ?? []) as InspectionFieldRow[]
}
