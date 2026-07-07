import fs from 'fs'
import path from 'path'
import handler from '../api/inspections.js'

(async () => {
  try { process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' } catch {}

  // load .env simple parser
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

  const req = { method: 'GET', url: '/api/inspections' }
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v },
    end(v) {
      try {
        const parsed = JSON.parse(v)
        console.log('OK', JSON.stringify(parsed, null, 2))
      } catch (e) {
        console.log('RAW', v)
      }
    }
  }

  await handler(req, res)
})()
