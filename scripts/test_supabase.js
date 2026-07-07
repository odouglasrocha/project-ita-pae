(async()=>{
  // permitir TLS inseguro em dev quando necessário (diagnóstico apenas)
  try { process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' } catch {}
  const url = 'https://obozbmqszuclsaiupqnw.supabase.co'
  // usar service role key (presente em .env como VITE_SUPABASE_SERVICE_ROLE_KEY)
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ib3pibXFzenVjbHNhaXVwcW53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkwNjg3MSwiZXhwIjoyMDk4NDgyODcxfQ.gEZT77aFcHjRq4IX4d9X6Ab6VJocbbfQJ9zrUc-mQCg'
  try{
    const res = await fetch(`${url}/rest/v1/inspection_results?select=*&limit=1`, {
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    })
    console.log('STATUS', res.status)
    const text = await res.text()
    console.log('BODY', text)
  } catch (e) {
    console.error('ERR', e && e.message ? e.message : e)
  }
})()
