import { createClient } from '@supabase/supabase-js'

async function insertInspection(supabase, input) {
  const { parsed, result, ocrRaw, ocrConfidence, sharpness, expectedLS, expectedExpiration, producaoISO } = input

  // Use canonical column names that exist in the upstream schema.
  const payload = {
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
    result_summary: result.aprovado ? 'Aprovado' : 'Reprovado',
  }

  const { data, error } = await supabase.from('inspection_results').insert(payload).select('id').single()
  if (error) throw error
  if (!data || !data.id) throw new Error('Insert returned no id')

  const fieldsPayload = result.campos.map((c) => ({
    inspection_id: data.id,
    field_name: c.campo,
    expected_value: c.esperado,
    found_value: c.encontrado,
    status: c.status,
  }))

  const { error: fieldsErr } = await supabase.from('inspection_result_fields').insert(fieldsPayload)
  if (fieldsErr) {
    // try rollback
    try { await supabase.from('inspection_results').delete().eq('id', data.id) } catch {}
    throw fieldsErr
  }

  return data.id
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405
      return res.end(JSON.stringify({ error: 'Method not allowed' }))
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      res.statusCode = 500
      return res.end(JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL in env' }))
    }

    const body = await new Promise((resolve, reject) => {
      let data = ''
      req.on('data', (chunk) => { data += chunk })
      req.on('end', () => {
        try { resolve(JSON.parse(data || '{}')) } catch (e) { reject(e) }
      })
      req.on('error', reject)
    })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const id = await insertInspection(supabase, body)
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ id }))
  } catch (e) {
    res.statusCode = 500
    return res.end(JSON.stringify({ error: e && e.message ? e.message : String(e) }))
  }
}
