import fs from 'fs'
import path from 'path'

try { process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' } catch {}
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z0-9_]+)=(.*)$/)
    if (m) {
      const k = m[1]
      let v = m[2]
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1)
      process.env[k] = v
    }
  })
}

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const payload = [{
  production_date: '2026-07-07',
  julian_code: 'LS999',
  expiration_date: '07/12/26',
  approved: true,
  raw_text: 'TEST',
  parsed_data: '07/12/26',
  parsed_ls: 'LS999',
  parsed_ea: '99',
  parsed_hour: '12:34',
  ocr_confidence: 50,
  sharpness: 80,
  result_summary: 'Aprovado'
}]

;(async () => {
  try{
    const res = await fetch(`${url}/rest/v1/inspection_results`, {
      method: 'POST',
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload)
    })
    console.log('STATUS', res.status)
    const txt = await res.text()
    console.log('BODY', txt)
  } catch(e){
    console.error('ERR', e && e.message ? e.message : e)
  }
})()
