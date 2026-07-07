(async()=>{
  try{ process.env.NODE_TLS_REJECT_UNAUTHORIZED='0' }catch{}
  const url='https://obozbmqszuclsaiupqnw.supabase.co'
  const key='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ib3pibXFzenVjbHNhaXVwcW53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjkwNjg3MSwiZXhwIjoyMDk4NDgyODcxfQ.gEZT77aFcHjRq4IX4d9X6Ab6VJocbbfQJ9zrUc-mQCg'
  try{
    const res=await fetch(`${url}/rest/v1/inspection_result_fields?select=*&limit=20`,{headers:{apikey:key,Authorization:'Bearer '+key}})
    console.log('STATUS',res.status)
    const json=await res.json()
    console.log(JSON.stringify(json, null, 2))
  }catch(e){console.error('ERR',e.message||e)}
})()
