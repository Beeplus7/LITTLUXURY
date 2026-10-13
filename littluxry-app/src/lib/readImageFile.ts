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
