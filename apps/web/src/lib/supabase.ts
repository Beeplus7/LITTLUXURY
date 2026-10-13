import { createBrowserSupabaseClient } from '@littluxury/shared'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase =
  url && anonKey
    ? createBrowserSupabaseClient({ url, anonKey })
    : null
