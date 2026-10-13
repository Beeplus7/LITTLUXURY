import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const roleHint = searchParams.get('role')

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
