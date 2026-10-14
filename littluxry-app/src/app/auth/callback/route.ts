import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readShopState } from '@/lib/shopStateServer'
import { normalizeEmail } from '@/lib/shopStaff'

function publicOrigin(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (env) return env

  const proto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    new URL(request.url).host

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

      const email = normalizeEmail(user?.email || '')
      const shop = await readShopState()
      const member = shop.staff.staff.find(
        (s) => s.email === email && s.active !== false,
      )

      if (roleHint === 'admin') {
        if (!member) {
          await supabase.auth.signOut()
          return NextResponse.redirect(
            `${origin}/admin/signin?error=not_on_team`,
          )
        }
        await supabase.auth.updateUser({
          data: {
            role: member.role,
            app_role: member.role,
            full_name: member.name,
          },
        })
        return NextResponse.redirect(`${origin}/dashboard`)
      }

      const dest =
        member && (member.role === 'owner' || member.role === 'staff')
          ? `${origin}/dashboard`
          : `${origin}${next.startsWith('/') ? next : `/${next}`}`

      return NextResponse.redirect(dest)
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth`)
}
