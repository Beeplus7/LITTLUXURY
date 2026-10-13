import { createBrowserSupabaseClient } from '@littluxury/shared'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase =
  url && anonKey
    ? createBrowserSupabaseClient({ url, anonKey })
    : null
