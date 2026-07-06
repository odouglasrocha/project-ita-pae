import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// In production/Vercel, if VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are not defined,
// show a detailed error instead of silently failing
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const missingVars = []
  if (!SUPABASE_URL) missingVars.push("VITE_SUPABASE_URL")
  if (!SUPABASE_ANON_KEY) missingVars.push("VITE_SUPABASE_ANON_KEY")
  const errorMsg = `[Supabase] Critical configuration error: Missing environment variables: ${missingVars.join(", ")}. 
  In Vercel/Production, add these to your project's Environment Variables in Settings.
  In local development, ensure .env.local exists with valid credentials.`
  console.error(errorMsg)
}

const clientKey = import.meta.env.DEV
  ? SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  : SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL || "", clientKey || "", {
  auth: { persistSession: false, autoRefreshToken: false },
})
