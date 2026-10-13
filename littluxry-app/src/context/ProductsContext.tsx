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
      return [...prev, product]
    })
  }, [])

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
      addVariant,
      setProducts,
    }),
    [products, getProduct, updateProduct, addProduct, addVariant, setProducts],
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
