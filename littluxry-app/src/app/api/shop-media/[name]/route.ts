import { NextResponse } from 'next/server'
import { open, readFile, stat } from 'fs/promises'
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
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
}

/** Serve runtime uploads with Range support (required for mobile video). */
export async function GET(
  req: Request,
  ctx: { params: { name: string } },
) {
  try {
    const name = ctx.params.name
    if (!name || !/^[\w.-]+$/.test(name)) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
    }
    const filePath = path.join(uploadsDir(), name)
    const root = path.resolve(uploadsDir())
    const resolved = path.resolve(filePath)
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    const st = await stat(resolved)
    const ext = path.extname(name).toLowerCase()
    let type = MIME[ext] || 'application/octet-stream'

    // Mislabeled QuickTime saved as .jpg/.jpeg — still serve as video
    if (type.startsWith('image/') || type === 'application/octet-stream') {
      const head = await readFile(resolved, { encoding: null }).then((b) =>
        b.subarray(0, 16),
      )
      if (
        head.length >= 12 &&
        head[4] === 0x66 &&
        head[5] === 0x79 &&
        head[6] === 0x70 &&
        head[7] === 0x74
      ) {
        const brand = head.subarray(8, 12).toString('ascii').toLowerCase()
        type = brand.includes('qt') ? 'video/quicktime' : 'video/mp4'
      }
    }

    const size = st.size
    const range = req.headers.get('range')
    const common = {
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    }

    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range)
      if (m) {
        const start = m[1] ? Number(m[1]) : 0
        let end = m[2] ? Number(m[2]) : size - 1
        if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
          return new NextResponse(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${size}` },
          })
        }
        end = Math.min(end, size - 1)
        const len = end - start + 1
        const fh = await open(resolved, 'r')
        try {
          const buf = Buffer.alloc(len)
          await fh.read(buf, 0, len, start)
          return new NextResponse(buf, {
            status: 206,
            headers: {
              ...common,
              'Content-Length': String(len),
              'Content-Range': `bytes ${start}-${end}/${size}`,
            },
          })
        } finally {
          await fh.close()
        }
      }
    }

    const buf = await readFile(resolved)
    return new NextResponse(buf, {
      status: 200,
      headers: {
        ...common,
        'Content-Length': String(buf.byteLength),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
