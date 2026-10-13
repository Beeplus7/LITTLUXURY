import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function publicOrigin(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (env) return env

  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    new URL(request.url).host

  // Avoid nginx → 127.0.0.1:3020 leaking into redirects
  if (!host || host.startsWith('localhost') || host.startsWith('127.')) {
    return 'https://litt-luxury.com'
  }
  return `${proto}://${host}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = publicOrigin(request)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const roleHint = searchParams.get('role')
  const oauthError = searchParams.get('error')
  const oauthDesc = searchParams.get('error_description')

  // Supabase / Google returned an error (e.g. invalid client secret)
  if (oauthError && !code) {
    const q = new URLSearchParams({
      error: oauthError,
      ...(oauthDesc ? { error_description: oauthDesc } : {}),
    })
    return NextResponse.redirect(`${origin}/signin?${q}`)
  }

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Promote demo/admin emails to owner role via user metadata when requested
      if (user && roleHint === 'admin') {
        await supabase.auth.updateUser({
          data: { role: 'owner', app_role: 'owner' },
        })
      }

      const dest =
        roleHint === 'admin' ||
        user?.user_metadata?.role === 'owner' ||
        user?.email?.endsWith('@littluxry.com')
          ? `${origin}/dashboard`
          : `${origin}${next.startsWith('/') ? next : `/${next}`}`

      return NextResponse.redirect(dest)
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`)
}
