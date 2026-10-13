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

type ProductsContextValue = {
  products: Product[]
  getProduct: (id: string) => Product | undefined
  updateProduct: (id: string, patch: Partial<Product>) => boolean
  addProduct: (product: Product) => boolean
  removeProduct: (id: string) => void
  duplicateProduct: (id: string) => Product | null
  addVariant: (productId: string, variant: ProductVariant) => void
  setProducts: (products: Product[]) => void
}

const STORAGE_KEY = 'littluxry_products'
const REMOVED_KEY = 'littluxry_products_removed'
const PLACEHOLDER_IMAGE = '/assets/fringe-hero.png'
const ProductsContext = createContext<ProductsContextValue | null>(null)

function readRemovedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(REMOVED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((x): x is string => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

function writeRemovedIds(ids: Set<string>) {
  try {
    localStorage.setItem(REMOVED_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    /* ignore quota / private mode */
  }
}

function readStoredProducts(): Product[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null) return null
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return null
    return parsed
      .map((p) => normalizeProduct(p as Product))
      .filter((p): p is Product => Boolean(p))
  } catch {
    return null
  }
}

function mergeCatalog(stored: Product[] | null, removed: Set<string>): Product[] {
  if (stored) {
    const ids = new Set(stored.map((p) => p.id))
    return [
      ...stored.filter((p) => !removed.has(p.id) && !removed.has(p.slug)),
      ...initialProducts.filter(
        (p) => !ids.has(p.id) && !removed.has(p.id) && !removed.has(p.slug),
      ),
    ]
  }
  return initialProducts.filter(
    (p) => !removed.has(p.id) && !removed.has(p.slug),
  )
}

function isDataUrl(src: string | undefined): boolean {
  return Boolean(src && src.startsWith('data:'))
}

/** Drop oversized data-URL media so the catalog fits in localStorage. */
function stripHeavyMedia(products: Product[]): Product[] {
  return products.map((p) => {
    const images = (p.images ?? [])
      .filter((src) => !isDataUrl(src))
      .slice(0, 16)
    return {
      ...p,
      images: images.length ? images : [PLACEHOLDER_IMAGE],
      video: isDataUrl(p.video) ? undefined : p.video,
    }
  })
}

function persistProducts(products: Product[]): {
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
  const skipNextPersistRef = useRef(false)

  useEffect(() => {
    try {
      const removed = readRemovedIds()
      removedIdsRef.current = removed
      setProductsState(mergeCatalog(readStoredProducts(), removed))
    } catch {
      setProductsState(initialProducts)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false
      return
    }
    const result = persistProducts(products)
    if (!result.ok) {
      notifyPersistIssue(
        'Could not save catalog on this device (storage full). Try smaller images.',
      )
      return
    }
    if (result.stripped) {
      skipNextPersistRef.current = true
      setProductsState(stripHeavyMedia(products))
      notifyPersistIssue(
        'Images were too large for device storage — placeholders used. Prefer Library media.',
      )
    }
  }, [products, hydrated])

  const getProduct = useCallback(
    (id: string) => products.find((p) => p.id === id || p.slug === id),
    [products],
  )

  const commitCatalog = useCallback((next: Product[]): boolean => {
    const result = persistProducts(next)
    if (!result.ok) {
      notifyPersistIssue(
        'Could not save catalog on this device (storage full). Try Library images.',
      )
      return false
    }
    if (result.stripped) {
      const lite = stripHeavyMedia(next)
      skipNextPersistRef.current = true
      setProductsState(lite)
      notifyPersistIssue(
        'Large uploads were replaced with placeholders — prefer From library.',
      )
      return true
    }
    skipNextPersistRef.current = true
    setProductsState(next)
    return true
  }, [])

  const updateProduct = useCallback(
    (id: string, patch: Partial<Product>): boolean => {
      const next = products.map((p) =>
        p.id === id || p.slug === id ? { ...p, ...patch } : p,
      )
      return commitCatalog(next)
    },
    [products, commitCatalog],
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
      removedIdsRef.current.delete(safe.id)
      removedIdsRef.current.delete(safe.slug)
      writeRemovedIds(removedIdsRef.current)
      const next = products.some((p) => p.id === safe.id)
        ? products.map((p) => (p.id === safe.id ? safe : p))
        : [safe, ...products]
      return commitCatalog(next)
    },
    [products, commitCatalog],
  )

  const removeProduct = useCallback(
    (id: string) => {
      const target = products.find((p) => p.id === id || p.slug === id)
      if (target) {
        removedIdsRef.current.add(target.id)
        removedIdsRef.current.add(target.slug)
      } else {
        removedIdsRef.current.add(id)
      }
      writeRemovedIds(removedIdsRef.current)
      commitCatalog(products.filter((p) => p.id !== id && p.slug !== id))
    },
    [products, commitCatalog],
  )

  const duplicateProduct = useCallback(
    (id: string): Product | null => {
      const source = products.find((p) => p.id === id || p.slug === id)
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
      const ok = commitCatalog([created, ...products])
      return ok ? created : null
    },
    [products, commitCatalog],
  )

  const addVariant = useCallback(
    (productId: string, variant: ProductVariant) => {
      setProductsState((prev) =>
        prev.map((p) => {
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
        }),
      )
    },
    [],
  )

  const setProducts = useCallback((next: Product[]) => {
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
