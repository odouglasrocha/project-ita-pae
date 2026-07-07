import fs from 'fs'
import path from 'path'
import handler from '../api/save-inspection.js'

// carrega .env
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

const body = {
  parsed: { data: '07/12/26', ls: 'LS300', ea: '55', hora: '12:00' },
  result: { aprovado: true, campos: [
    { campo: 'EA', esperado: null, encontrado: '55', status: 'ok' },
    { campo: 'Hora', esperado: null, encontrado: '12:00', status: 'ok' },
    { campo: 'Data de Validade', esperado: '07/12/26', encontrado: '07/12/26', status: 'ok' },
    { campo: 'Código Juliano (LS)', esperado: 'LS300', encontrado: 'LS300', status: 'ok' },
  ]},
  ocrRaw: 'TEST',
  ocrConfidence: 50,
  sharpness: 80,
  expectedLS: 'LS300',
  expectedExpiration: '07/12/26',
  producaoISO: '2026-07-07'
}

const req = {
  method: 'POST',
  on: (e, cb) => {},
}

// mock res
const res = {
  statusCode: 200,
  headers: {},
  setHeader(k, v) { this.headers[k] = v },
  end(v) { try { console.log('RESPONSE', JSON.stringify(JSON.parse(v), null, 2)) } catch (e) { console.log('RAW', v) } }
}

// call handler by simulating streaming body
;(async () => {
  // simulate req stream
  const stream = new (await import('stream')).Readable()
  stream.push(JSON.stringify(body))
  stream.push(null)
  stream.method = 'POST'
  stream.on = stream.addListener.bind(stream)
  await handler(stream, res)
})()
