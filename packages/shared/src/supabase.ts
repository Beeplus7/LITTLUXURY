import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type SupabasePublicConfig = {
  url: string
  anonKey: string
}

/** Public/anon client for web & mobile. Never pass the service role key here. */
export function createBrowserSupabaseClient(
  config: SupabasePublicConfig,
): SupabaseClient {
  if (!config.url || !config.anonKey) {
    throw new Error('Missing Supabase URL or anon key')
  }

  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}
