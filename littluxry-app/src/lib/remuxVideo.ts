import { execFile } from 'child_process'
import { promisify } from 'util'
import { unlink } from 'fs/promises'
import path from 'path'

const execFileAsync = promisify(execFile)

/**
 * Remux QuickTime (.mov) → .mp4 (H.264 copy) so Chrome/Android can play
 * iPhone camera clips. No re-encode when codecs allow stream copy.
 */
export async function remuxMovToMp4IfNeeded(
  filePath: string,
  ext: string,
): Promise<{ path: string; ext: string; contentType: string } | null> {
  if (ext !== '.mov' && ext !== '.qt') return null
  const outPath = filePath.replace(/\.mov$/i, '.mp4').replace(/\.qt$/i, '.mp4')
  const finalOut =
    outPath === filePath ? `${filePath}.mp4` : outPath
  try {
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-i',
        filePath,
        '-c',
        'copy',
        '-movflags',
        '+faststart',
        finalOut,
      ],
      { timeout: 120_000 },
    )
    try {
      await unlink(filePath)
    } catch {
      /* keep original if delete fails */
    }
    return {
      path: finalOut,
      ext: '.mp4',
      contentType: 'video/mp4',
    }
  } catch {
    return null
  }
}

export function uploadsNameFromPath(filePath: string): string {
  return path.basename(filePath)
}
