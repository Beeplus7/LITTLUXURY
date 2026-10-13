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
  updateProduct: (id: string, patch: Partial<Product>) => void
  addProduct: (product: Product) => void
  removeProduct: (id: string) => void
  duplicateProduct: (id: string) => Product | null
  addVariant: (productId: string, variant: ProductVariant) => void
  setProducts: (products: Product[]) => void
}

const STORAGE_KEY = 'littluxry_products'
const REMOVED_KEY = 'littluxry_products_removed'
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
  localStorage.setItem(REMOVED_KEY, JSON.stringify(Array.from(ids)))
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

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProductsState] = useState<Product[]>(initialProducts)
  const [hydrated, setHydrated] = useState(false)
  const removedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const removed = readRemovedIds()
    removedIdsRef.current = removed
    setProductsState(mergeCatalog(readStoredProducts(), removed))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  }, [products, hydrated])

  const getProduct = useCallback(
    (id: string) => products.find((p) => p.id === id || p.slug === id),
    [products],
  )

  const updateProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProductsState((prev) =>
      prev.map((p) => (p.id === id || p.slug === id ? { ...p, ...patch } : p)),
    )
  }, [])

  const addProduct = useCallback((product: Product) => {
    removedIdsRef.current.delete(product.id)
    removedIdsRef.current.delete(product.slug)
    writeRemovedIds(removedIdsRef.current)
    setProductsState((prev) => {
      if (prev.some((p) => p.id === product.id)) {
        return prev.map((p) => (p.id === product.id ? product : p))
      }
      return [product, ...prev]
    })
  }, [])

  const removeProduct = useCallback((id: string) => {
    setProductsState((prev) => {
      const target = prev.find((p) => p.id === id || p.slug === id)
      if (target) {
        removedIdsRef.current.add(target.id)
        removedIdsRef.current.add(target.slug)
      } else {
        removedIdsRef.current.add(id)
      }
      writeRemovedIds(removedIdsRef.current)
      return prev.filter((p) => p.id !== id && p.slug !== id)
    })
  }, [])

  const duplicateProduct = useCallback((id: string): Product | null => {
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
      variants: source.variants.map((v) => ({
        ...v,
        id: `${newId}-${v.id}`,
        sku: `${v.sku}-C`,
      })),
    }
    setProductsState((prev) => [created, ...prev])
    return created
  }, [products])

  const addVariant = useCallback((productId: string, variant: ProductVariant) => {
    setProductsState((prev) =>
      prev.map((p) => {
        if (p.id !== productId && p.slug !== productId) return p
        const exists = p.variants.some((v) => v.id === variant.id)
        return {
          ...p,
          variants: exists
            ? p.variants.map((v) => (v.id === variant.id ? variant : v))
            : [...p.variants, variant],
          colors: p.colors.some((c) => c.name === variant.color)
            ? p.colors
            : [
                ...p.colors,
                { name: variant.color, hex: variant.hex, label: variant.color },
              ],
        }
      }),
    )
  }, [])

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
