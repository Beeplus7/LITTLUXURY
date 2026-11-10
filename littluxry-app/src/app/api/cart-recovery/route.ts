import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { pushAdminNotification } from '@/lib/adminNotifications'
import { sendCartRecoveryEmail } from '@/lib/orderEmail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CartLine = {
  name: string
  quantity: number
  price: number
  productId?: string
  color?: string
}

type RecoveryRecord = {
  email: string
  sentAt: string
  total: number
  itemCount: number
}

function dataDir() {
  return path.join(process.cwd(), 'data')
}

function recoveryPath() {
  return path.join(dataDir(), 'cart-recovery-sent.json')
}

async function readMap(): Promise<Record<string, RecoveryRecord>> {
  try {
    const raw = await readFile(recoveryPath(), 'utf8')
    return JSON.parse(raw) as Record<string, RecoveryRecord>
  } catch {
    return {}
  }
}

function publicOrigin(request: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (env) return env
  return 'https://litt-luxury.com'
}

export async function POST(request: Request) {
  let body: {
    email?: string
    items?: CartLine[]
    total?: number
    source?: string
  }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = (body.email || '').trim().toLowerCase()
  const items = Array.isArray(body.items) ? body.items : []
  if (!email.includes('@') || !items.length) {
    return NextResponse.json(
      { error: 'Email and cart items are required' },
      { status: 400 },
    )
  }

  const total = Math.max(
    0,
    Number(body.total) ||
      items.reduce((s, i) => s + Number(i.price) * Number(i.quantity || 1), 0),
  )

  const map = await readMap()
  const prior = map[email]
  if (prior) {
    const age = Date.now() - new Date(prior.sentAt).getTime()
    if (age < 6 * 60 * 60 * 1000) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'recently-sent',
      })
    }
  }

  const origin = publicOrigin(request)
  const mail = await sendCartRecoveryEmail({
    to: email,
    items: items.map((i) => ({
      name: String(i.name || 'Item').slice(0, 120),
      quantity: Math.max(1, Math.round(Number(i.quantity) || 1)),
      price: Number(i.price) || 0,
    })),
    total,
    checkoutUrl: `${origin}/checkout`,
  })

  if (!mail.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: mail.error,
        hint: 'Add RESEND_API_KEY or SMTP to send cart recovery emails.',
      },
      { status: 503 },
    )
  }

  map[email] = {
    email,
    sentAt: new Date().toISOString(),
    total,
    itemCount: items.length,
  }
  await mkdir(dataDir(), { recursive: true })
  await writeFile(recoveryPath(), JSON.stringify(map, null, 2), 'utf8')

  await pushAdminNotification({
    type: 'cart_recovery',
    title: 'Cart recovery sent',
    body: `${email} · $${total.toFixed(2)} · ${items.length} item(s)`,
    href: '/dashboard/orders',
    meta: { email, total },
  })

  return NextResponse.json({ ok: true, skipped: false, to: email })
}
