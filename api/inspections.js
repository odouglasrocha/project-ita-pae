import { createClient } from '@supabase/supabase-js'

function normalizeRow(r) {
  const approved = r.approved ?? r.aprovado ?? false
  const statusStr = typeof r.result_summary === 'string' && r.result_summary.trim()
    ? r.result_summary
    : typeof r.status === 'string' && r.status.trim()
      ? r.status
      : approved === true
        ? 'APROVADO'
        : approved === false
          ? 'REPROVADO'
          : ''

  return {
    id: String(r.id ?? ''),
    created_at: String(r.created_at ?? new Date().toISOString()),
    status: String(statusStr ?? ''),
    aprovado: !!approved,
    ea: r.parsed_ea ?? r.ea ?? null,
    ls: r.parsed_ls ?? r.ls ?? r.julian_code ?? null,
    data_validade: r.parsed_data ?? r.data_validade ?? r.expiration_date ?? null,
    hora: r.parsed_hour ?? r.hora ?? null,
    producao: r.production_date ?? r.producao ?? null,
    ocr_raw: r.raw_text ?? r.ocr_raw ?? null,
    ocr_confidence: (r.ocr_confidence ?? null),
    sharpness: r.sharpness ?? null,
    inspection_result_fields: Array.isArray(r.inspection_result_fields) ? r.inspection_result_fields : undefined,
  }
}

export default async function handler(req, res) {
  try {
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      res.statusCode = 500
      return res.end(JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL in env' }))
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await supabase
      .from('inspection_results')
      .select('*, inspection_result_fields(*)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      res.statusCode = 502
      return res.end(JSON.stringify({ error: error.message }))
    }

    const normalized = (data ?? []).map(normalizeRow)

    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ data: normalized }))
  } catch (e) {
    res.statusCode = 500
    return res.end(JSON.stringify({ error: e && e.message ? e.message : String(e) }))
  }
}
