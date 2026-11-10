/** Detect real media type from File + magic bytes so videos never save as .jpg */

export function sniffUploadExt(
  file: File,
  buf: Buffer,
): { ext: string; contentType: string } {
  const nameExt = (file.name.split('.').pop() || '').toLowerCase()
  const type = (file.type || '').toLowerCase()

  // ISO BMFF / MP4 / QuickTime — ftyp box at byte 4
  const isFtyp =
    buf.length >= 12 &&
    buf[4] === 0x66 &&
    buf[5] === 0x79 &&
    buf[6] === 0x70 &&
    buf[7] === 0x74
  const brand =
    isFtyp && buf.length >= 12
      ? buf.slice(8, 12).toString('ascii').toLowerCase()
      : ''

  const isWebm =
    buf.length >= 4 &&
    buf[0] === 0x1a &&
    buf[1] === 0x45 &&
    buf[2] === 0xdf &&
    buf[3] === 0xa3

  const isVideoMime =
    type.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'm4v', 'qt'].includes(nameExt)

  if (isWebm || type === 'video/webm' || nameExt === 'webm') {
    return { ext: '.webm', contentType: 'video/webm' }
  }

  if (isFtyp || isVideoMime) {
    // qt / QuickTime → .mov (Safari plays it); mpeg4 → .mp4
    if (
      brand.includes('qt') ||
      type.includes('quicktime') ||
      nameExt === 'mov' ||
      nameExt === 'qt'
    ) {
      return { ext: '.mov', contentType: 'video/quicktime' }
    }
    return { ext: '.mp4', contentType: 'video/mp4' }
  }

  if (type === 'image/png' || nameExt === 'png' || buf[0] === 0x89) {
    return { ext: '.png', contentType: 'image/png' }
  }
  if (type === 'image/webp' || nameExt === 'webp') {
    return { ext: '.webp', contentType: 'image/webp' }
  }
  if (type === 'image/gif' || nameExt === 'gif') {
    return { ext: '.gif', contentType: 'image/gif' }
  }

  return { ext: '.jpg', contentType: 'image/jpeg' }
}

export const VIDEO_EXTS = ['.mp4', '.webm', '.mov', '.m4v'] as const
