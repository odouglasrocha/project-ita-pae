import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://obozbmqszuclsaiupqnw.supabase.co"
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ""
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ""

const clientKey = import.meta.env.DEV ? SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY : SUPABASE_ANON_KEY

if (!SUPABASE_URL || !clientKey) {
  console.warn("[supabase] Variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY não foram encontradas.")
}

export const supabase = createClient(SUPABASE_URL, clientKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
