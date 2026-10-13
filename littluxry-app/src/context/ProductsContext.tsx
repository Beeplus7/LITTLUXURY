'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
const ProductsContext = createContext<ProductsContextValue | null>(null)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProductsState] = useState<Product[]>(initialProducts)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Product[]
        if (Array.isArray(parsed) && parsed.length) {
          const normalized = parsed
            .map((p) => normalizeProduct(p))
            .filter((p): p is Product => Boolean(p))
          // Merge in any new catalog items missing from stored list
          const ids = new Set(normalized.map((p) => p.id))
          const merged = [
            ...normalized,
            ...initialProducts.filter((p) => !ids.has(p.id)),
          ]
          setProductsState(merged)
        }
      }
    } catch {
      /* ignore */
    }
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
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    )
  }, [])

  const addProduct = useCallback((product: Product) => {
    setProductsState((prev) => {
      if (prev.some((p) => p.id === product.id)) {
        return prev.map((p) => (p.id === product.id ? product : p))
      }
      return [product, ...prev]
    })
  }, [])

  const removeProduct = useCallback((id: string) => {
    setProductsState((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const duplicateProduct = useCallback((id: string): Product | null => {
    const source = products.find((p) => p.id === id)
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
        if (p.id !== productId) return p
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
