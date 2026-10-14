import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { readShopState, uploadsDir } from '@/lib/shopStateServer'
import { normalizeEmail } from '@/lib/shopStaff'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const email = normalizeEmail(req.headers.get('x-shop-actor') || '')
    const state = await readShopState()
    const allowed =
      !state.staff.ownerEmail ||
      state.staff.staff.some((s) => s.email === email && s.active !== false)
    if (!email || !allowed) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (file.size > 12_000_000) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    const dir = uploadsDir()
    await mkdir(dir, { recursive: true })
    const ext =
      path.extname(file.name).toLowerCase() ||
      (file.type.startsWith('video/') ? '.mp4' : '.jpg')
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp4', '.webm'].includes(
      ext,
    )
      ? ext
      : '.jpg'
    const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${safeExt}`
    const buf = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(dir, name), buf)
    const src = `/assets/uploads/${name}`
    return NextResponse.json({ src })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 500 },
    )
  }
}
