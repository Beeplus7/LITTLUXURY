/** Read an image file as a data URL, optionally downscaling large uploads. */
export async function readImageAsDataUrl(
  file: File,
  opts?: { maxEdge?: number; maxBytes?: number },
): Promise<string> {
  const maxBytes = opts?.maxBytes ?? 4_500_000
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file')
  }
  if (file.size > maxBytes) {
    throw new Error('Image is too large (max ~4.5MB)')
  }

  const maxEdge = opts?.maxEdge ?? 1600
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Could not process image')
  }
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const quality = mime === 'image/jpeg' ? 0.86 : undefined
  const dataUrl = canvas.toDataURL(mime, quality)
  if (dataUrl.length > 6_500_000) {
    throw new Error('Processed image is still too large — try a smaller file')
  }
  return dataUrl
}

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
])

/** Read a short product video as a data URL (kept small for localStorage catalog). */
export async function readVideoAsDataUrl(
  file: File,
  opts?: { maxBytes?: number },
): Promise<string> {
  const maxBytes = opts?.maxBytes ?? 8_000_000
  if (!file.type.startsWith('video/') && !VIDEO_TYPES.has(file.type)) {
    throw new Error('Please choose a video file (MP4 or WebM)')
  }
  if (file.type && !VIDEO_TYPES.has(file.type) && file.type !== 'video/ogg') {
    throw new Error('Use MP4 or WebM for best playback')
  }
  if (file.size > maxBytes) {
    throw new Error('Video is too large (max ~8MB for catalog storage)')
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read video'))
    }
    reader.onerror = () => reject(new Error('Could not read video'))
    reader.readAsDataURL(file)
  })

  if (dataUrl.length > 12_000_000) {
    throw new Error('Video data is too large — try a shorter/compressed clip')
  }
  return dataUrl
}
