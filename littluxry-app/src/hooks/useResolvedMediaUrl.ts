'use client'

import { useEffect, useState } from 'react'
import { isLocalMediaRef, resolveMediaUrl } from '@/lib/localMediaStore'

/** Resolve local-media IndexedDB refs (and pass through normal paths/data URLs). */
export function useResolvedMediaUrl(src: string | undefined | null): string {
  const [url, setUrl] = useState(() =>
    src && !isLocalMediaRef(src) ? src : '',
  )

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null

    async function run() {
      if (!src) {
        if (active) setUrl('')
        return
      }
      if (!isLocalMediaRef(src)) {
        if (active) setUrl(src)
        return
      }
      try {
        const resolved = await resolveMediaUrl(src)
        if (!active) {
          if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved)
          return
        }
        if (resolved.startsWith('blob:')) objectUrl = resolved
        setUrl(resolved)
      } catch {
        if (active) setUrl('')
      }
    }

    void run()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  return url
}
