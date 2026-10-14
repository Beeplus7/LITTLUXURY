'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  initialProducts,
  normalizeProduct,
  type Product,
  type ProductVariant,
} from '@/data/products'
import { loadJson, persistJson } from '@/lib/durableJson'
import {
  isLocalMediaRef,
  persistInlineMediaSrcs,
} from '@/lib/localMediaStore'
import { fetchShopState, syncCatalog } from '@/lib/shopSyncClient'

function actorEmail(): string | null {
  try {
    const raw = localStorage.getItem('littluxry_auth')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { email?: string }
    return parsed.email?.trim().toLowerCase() || null
  } catch {
    return null
  }
}

function pushCatalogToServer(products: Product[], removed: Set<string>) {
  const email = actorEmail()
  if (!email) return
  void syncCatalog(email, products, Array.from(removed))
}

type ProductsContextValue = {
  products: Product[]
  getProduct: (id: string) => Product | undefined
  updateProduct: (id: string, patch: Partial<Product>) => boolean
  addProduct: (product: Product) => boolean
  removeProduct: (id: string) => boolean
  duplicateProduct: (id: string) => Product | null
  addVariant: (productId: string, variant: ProductVariant) => void
  setProducts: (products: Product[]) => void
}

const STORAGE_KEY = 'littluxry_products'
const REMOVED_KEY = 'littluxry_products_removed'
const DURABLE_PRODUCTS = 'products_catalog'
const DURABLE_REMOVED = 'products_removed'
const PLACEHOLDER_IMAGE = '/assets/fringe-hero.png'
const ProductsContext = createContext<ProductsContextValue | null>(null)

function normalizeList(parsed: unknown): Product[] {
  if (!Array.isArray(parsed)) return []
  return parsed
    .map((p) => normalizeProduct(p as Product))
    .filter((p): p is Product => Boolean(p))
}

function normalizeRemoved(parsed: unknown): Set<string> {
  if (!Array.isArray(parsed)) return new Set()
  return new Set(parsed.filter((x): x is string => typeof x === 'string'))
}

/**
 * Stored catalog is source of truth once it exists.
 * Do NOT re-inject seed products on every load — that resurrected deletes.
 */
function applyRemoved(list: Product[], removed: Set<string>): Product[] {
  return list.filter((p) => !removed.has(p.id) && !removed.has(p.slug))
}

function isDataUrl(src: string | undefined): boolean {
  return Boolean(src && src.startsWith('data:'))
}

function stripHeavyMedia(products: Product[]): Product[] {
  return products.map((p) => {
    const kept = (p.images ?? [])
      .filter((src) => !isDataUrl(src) || isLocalMediaRef(src))
      .slice(0, 24)
    const video =
      p.video && isDataUrl(p.video) && !isLocalMediaRef(p.video)
        ? undefined
        : p.video
    const images = kept.length
      ? kept
      : video
        ? [video]
        : [PLACEHOLDER_IMAGE]
    return {
      ...p,
      images,
      video,
    }
  })
}

function persistProductsSync(products: Product[]): {
  ok: boolean
  stripped: boolean
} {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
    return { ok: true, stripped: false }
  } catch {
    try {
      const lite = stripHeavyMedia(products)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lite))
      return { ok: true, stripped: true }
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(stripHeavyMedia(products)),
        )
        return { ok: true, stripped: true }
      } catch {
        return { ok: false, stripped: false }
      }
    }
  }
}

async function persistCatalog(products: Product[]): Promise<{
  ok: boolean
  stripped: boolean
  list: Product[]
}> {
  const sync = persistProductsSync(products)
  let list = products
  if (sync.stripped) list = stripHeavyMedia(products)
  // Always mirror to IndexedDB so deletes survive localStorage quota issues
  const durableOk = await persistJson(STORAGE_KEY, DURABLE_PRODUCTS, list)
  return { ok: sync.ok || durableOk, stripped: sync.stripped, list }
}

async function persistRemoved(ids: Set<string>): Promise<boolean> {
  return persistJson(REMOVED_KEY, DURABLE_REMOVED, Array.from(ids))
}

function notifyPersistIssue(message: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('littluxry:toast', { detail: { message } }),
  )
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProductsState] = useState<Product[]>(initialProducts)
  const [hydrated, setHydrated] = useState(false)
  const removedIdsRef = useRef<Set<string>>(new Set())
  const productsRef = useRef<Product[]>(initialProducts)
  const skipNextPersistRef = useRef(false)

  useEffect(() => {
    productsRef.current = products
  }, [products])

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      try {
        const [storedRaw, removedRaw, remote] = await Promise.all([
          loadJson<unknown>(STORAGE_KEY, DURABLE_PRODUCTS),
          loadJson<unknown>(REMOVED_KEY, DURABLE_REMOVED),
          fetchShopState(),
        ])
        const localRemoved = normalizeRemoved(removedRaw)
        const remoteRemoved = normalizeRemoved(remote?.removedIds)
        const removed = new Set<string>([
          ...Array.from(localRemoved),
          ...Array.from(remoteRemoved),
        ])
        removedIdsRef.current = removed

        const remoteProducts = normalizeList(remote?.products)
        const hasRemoteCatalog =
          Boolean(remote) &&
          (remoteProducts.length > 0 || remoteRemoved.size > 0)

        let catalog: Product[]
        if (hasRemoteCatalog) {
          // Shared shop store wins across devices
          catalog = applyRemoved(remoteProducts, removed)
        } else if (storedRaw != null) {
          catalog = applyRemoved(normalizeList(storedRaw), removed)
        } else {
          catalog = applyRemoved(initialProducts, removed)
        }

        const migrated = await Promise.all(
          catalog.map(async (p) => {
            const needs =
              (p.images ?? []).some(
                (src) => src.startsWith('data:') && !isLocalMediaRef(src),
              ) ||
              Boolean(
                p.video?.startsWith('data:') && !isLocalMediaRef(p.video),
              )
            if (!needs) return p
            const images = await persistInlineMediaSrcs(p.images ?? [])
            let video = p.video
            if (video?.startsWith('data:') && !isLocalMediaRef(video)) {
              const [v] = await persistInlineMediaSrcs([video])
              video = v || undefined
            }
            return {
              ...p,
              images: images.length ? images : p.images,
              video,
            }
          }),
        )

        if (!cancelled) {
          skipNextPersistRef.current = true
          productsRef.current = migrated
          setProductsState(migrated)
          void persistCatalog(migrated)
          void persistRemoved(removed)
          // Seed server from this device when remote catalog empty
          if (!hasRemoteCatalog && migrated.length) {
            pushCatalogToServer(migrated, removed)
          }
        }
      } catch {
        if (!cancelled) {
          skipNextPersistRef.current = true
          setProductsState(initialProducts)
        }
      }
      if (!cancelled) setHydrated(true)
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }
    void (async () => {
      const result = await persistCatalog(products)
      if (!result.ok) {
        notifyPersistIssue(
          'Could not save catalog on this device (storage full). Try smaller images.',
        )
        return
      }
      if (result.stripped) {
        skipNextPersistRef.current = true
        productsRef.current = result.list
        setProductsState(result.list)
        notifyPersistIssue(
          'Images were too large for device storage — placeholders used. Prefer Library media.',
        )
      }
    })()
  }, [products, hydrated])

  const getProduct = useCallback(
    (id: string) => products.find((p) => p.id === id || p.slug === id),
    [products],
  )

  const commitCatalog = useCallback((next: Product[]): boolean => {
    const sync = persistProductsSync(next)
    if (!sync.ok) {
      // Still try IndexedDB asynchronously
      void persistCatalog(next).then((r) => {
        if (!r.ok) {
          notifyPersistIssue(
            'Could not save catalog on this device (storage full). Try Library images.',
          )
        }
      })
    } else {
      void persistCatalog(sync.stripped ? stripHeavyMedia(next) : next)
    }

    const list = sync.stripped ? stripHeavyMedia(next) : next
    pushCatalogToServer(list, removedIdsRef.current)
    if (!sync.ok) {
      // Optimistic UI + durable write in flight
      skipNextPersistRef.current = true
      productsRef.current = list
      setProductsState(list)
      return true
    }
    skipNextPersistRef.current = true
    productsRef.current = list
    setProductsState(list)
    if (sync.stripped) {
      notifyPersistIssue(
        'Large uploads were replaced with placeholders — prefer From library.',
      )
    }
    return true
  }, [])

  const updateProduct = useCallback(
    (id: string, patch: Partial<Product>): boolean => {
      const next = productsRef.current.map((p) =>
        p.id === id || p.slug === id ? { ...p, ...patch } : p,
      )
      return commitCatalog(next)
    },
    [commitCatalog],
  )

  const addProduct = useCallback(
    (product: Product): boolean => {
      const safe: Product = {
        ...product,
        images: Array.isArray(product.images) ? product.images : [],
        colors: Array.isArray(product.colors) ? product.colors : [],
        features: Array.isArray(product.features) ? product.features : [],
        variants: Array.isArray(product.variants) ? product.variants : [],
      }
      // Publishing a product should not resurrect other deleted items
      removedIdsRef.current.delete(safe.id)
      removedIdsRef.current.delete(safe.slug)
      void persistRemoved(removedIdsRef.current)

      const current = productsRef.current
      const next = current.some((p) => p.id === safe.id)
        ? current.map((p) => (p.id === safe.id ? safe : p))
        : [safe, ...current]
      return commitCatalog(next)
    },
    [commitCatalog],
  )

  const removeProduct = useCallback(
    (id: string): boolean => {
      const current = productsRef.current
      const target = current.find((p) => p.id === id || p.slug === id)
      if (target) {
        removedIdsRef.current.add(target.id)
        removedIdsRef.current.add(target.slug)
      } else {
        removedIdsRef.current.add(id)
      }
      void persistRemoved(removedIdsRef.current)

      const next = current.filter((p) => p.id !== id && p.slug !== id)
      const ok = commitCatalog(next)
      if (!ok) {
        notifyPersistIssue('Could not delete product — storage full')
        return false
      }
      return true
    },
    [commitCatalog],
  )

  const duplicateProduct = useCallback(
    (id: string): Product | null => {
      const source = productsRef.current.find(
        (p) => p.id === id || p.slug === id,
      )
      if (!source) return null
      const stamp = Date.now().toString(36)
      const newId = `${source.id}-copy-${stamp}`
      const created: Product = {
        ...source,
        id: newId,
        slug: `${source.slug}-copy-${stamp}`,
        name: `${source.name} (Copy)`,
        menuLabel: `${source.menuLabel} Copy`,
        variants: (source.variants ?? []).map((v) => ({
          ...v,
          id: `${newId}-${v.id}`,
          sku: `${v.sku}-C`,
        })),
        images: [...(source.images ?? [])],
        colors: [...(source.colors ?? [])],
        features: [...(source.features ?? [])],
      }
      const ok = commitCatalog([created, ...productsRef.current])
      return ok ? created : null
    },
    [commitCatalog],
  )

  const addVariant = useCallback(
    (productId: string, variant: ProductVariant) => {
      const next = productsRef.current.map((p) => {
        if (p.id !== productId && p.slug !== productId) return p
        const variants = p.variants ?? []
        const colors = p.colors ?? []
        const exists = variants.some((v) => v.id === variant.id)
        return {
          ...p,
          variants: exists
            ? variants.map((v) => (v.id === variant.id ? variant : v))
            : [...variants, variant],
          colors: colors.some((c) => c.name === variant.color)
            ? colors
            : [
                ...colors,
                {
                  name: variant.color,
                  hex: variant.hex,
                  label: variant.color,
                },
              ],
        }
      })
      commitCatalog(next)
    },
    [commitCatalog],
  )

  const setProducts = useCallback((next: Product[]) => {
    productsRef.current = next
    setProductsState(next)
  }, [])

  const value = useMemo(
    () => ({
      products,
      getProduct,
      updateProduct,
      addProduct,
      removeProduct,
      duplicateProduct,
      addVariant,
      setProducts,
    }),
    [
      products,
      getProduct,
      updateProduct,
      addProduct,
      removeProduct,
      duplicateProduct,
      addVariant,
      setProducts,
    ],
  )

  return (
    <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
  )
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider')
  return ctx
}
