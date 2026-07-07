import { createClient } from "@supabase/supabase-js"

// External Supabase project (pae). Anon key is publishable — safe on the client.
// Values come from environment variables (.env local / Vercel Project Settings).
// Fallbacks garantem funcionamento se as variáveis não estiverem definidas.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://obozbmqszuclsaiupqnw.supabase.co"

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ib3pibXFzenVjbHNhaXVwcW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDY4NzEsImV4cCI6MjA5ODQ4Mjg3MX0.dSkLRe-B4fgKx1W1Z7NshN96bQA7nUchg01loGmJSWc"

// Em dev podemos usar a service role key definida em .env (VITE_SUPABASE_SERVICE_ROLE_KEY)
// para contornar RLS durante desenvolvimento. NÃO recomendável em produção.
const SUPABASE_SERVICE_ROLE_KEY = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined) ?? undefined

const KEY_TO_USE = SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, KEY_TO_USE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

