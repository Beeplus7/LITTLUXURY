import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { readShopState, uploadsDir } from '@/lib/shopStateServer'
import { normalizeEmail } from '@/lib/shopStaff'
import { sniffUploadExt } from '@/lib/uploadMime'
import { remuxMovToMp4IfNeeded } from '@/lib/remuxVideo'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

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
    if (file.size > 40_000_000) {
      return NextResponse.json(
        { error: 'File too large (max 40MB for video)' },
        { status: 400 },
      )
    }

    const dir = uploadsDir()
    await mkdir(dir, { recursive: true })
    const buf = Buffer.from(await file.arrayBuffer())
    let { ext, contentType } = sniffUploadExt(file, buf)
    const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    let name = `${stamp}${ext}`
    let filePath = path.join(dir, name)
    await writeFile(filePath, buf)

    // iPhone .mov → browser-playable .mp4 (stream copy)
    if (contentType.startsWith('video/')) {
      const remuxed = await remuxMovToMp4IfNeeded(filePath, ext)
      if (remuxed) {
        filePath = remuxed.path
        name = path.basename(remuxed.path)
        ext = remuxed.ext
        contentType = remuxed.contentType
      }
    }

    const src = `/assets/uploads/${name}`
    return NextResponse.json({
      src,
      contentType,
      kind: contentType.startsWith('video/') ? 'video' : 'image',
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 500 },
    )
  }
}
