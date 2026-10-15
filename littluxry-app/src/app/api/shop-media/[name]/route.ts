import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { uploadsDir } from '@/lib/shopStateServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

/** Serve runtime uploads — Next.js does not pick up files written to public/ after start. */
export async function GET(
  _req: Request,
  ctx: { params: { name: string } },
) {
  try {
    const name = ctx.params.name
    if (!name || !/^[\w.-]+$/.test(name)) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
    }
    const filePath = path.join(uploadsDir(), name)
    // Ensure resolved path stays inside uploads dir
    const root = path.resolve(uploadsDir())
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
    const buf = await readFile(resolved)
    const ext = path.extname(name).toLowerCase()
    const type = MIME[ext] || 'application/octet-stream'
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Content-Length': String(buf.byteLength),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
