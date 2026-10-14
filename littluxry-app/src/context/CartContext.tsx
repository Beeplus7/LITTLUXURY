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
  orderShippingTotal,
  type ShipRegion,
  type ShippingRates,
} from '@/lib/shipping'

export type CartItem = {
  productId: string
  name: string
  price: number
  color: string
  size?: string
  quantity: number
  image?: string
  shippingEurope?: number
  shippingUsa?: number
}

type CartContextValue = {
  cartItems: CartItem[]
  cartCount: number
  /** Merchandise subtotal (no shipping) */
  subtotal: number
  /** Shipping for selected region */
  shipping: number
  /** subtotal + shipping */
  total: number
  shipRegion: ShipRegion
  setShipRegion: (region: ShipRegion) => void
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeFromCart: (productId: string, color: string, size?: string) => void
  updateQuantity: (
    productId: string,
    color: string,
    quantity: number,
    size?: string,
  ) => void
  clearCart: () => void
  isCartOpen: boolean
  setCartOpen: (open: boolean) => void
}

const STORAGE_KEY = 'littluxry_cart'
const REGION_KEY = 'littluxry_ship_region'
const CartContext = createContext<CartContextValue | null>(null)

function lineKey(productId: string, color: string, size?: string) {
  return `${productId}::${color}::${size || ''}`
}

function sameLine(
  item: CartItem,
  productId: string,
  color: string,
  size?: string,
) {
  return (
    lineKey(item.productId, item.color, item.size) ===
    lineKey(productId, color, size)
  )
}

function readRegion(): ShipRegion {
  try {
    const raw = localStorage.getItem(REGION_KEY)
    if (raw === 'europe' || raw === 'usa') return raw
  } catch {
    /* ignore */
  }
  return 'europe'
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [shipRegion, setShipRegionState] = useState<ShipRegion>('europe')
  const [isCartOpen, setCartOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setCartItems(JSON.parse(raw) as CartItem[])
      setShipRegionState(readRegion())
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems))
    } catch {
      /* ignore quota */
    }
  }, [cartItems, hydrated])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(REGION_KEY, shipRegion)
    } catch {
      /* ignore */
    }
  }, [shipRegion, hydrated])

  const setShipRegion = useCallback((region: ShipRegion) => {
    setShipRegionState(region)
  }, [])

  const addToCart = useCallback(
    (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      const qty = item.quantity ?? 1
      setCartItems((prev) => {
        const idx = prev.findIndex((p) =>
          sameLine(p, item.productId, item.color, item.size),
        )
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = {
            ...next[idx],
            ...item,
            quantity: next[idx].quantity + qty,
          }
          return next
        }
        return [...prev, { ...item, quantity: qty }]
      })
      setCartOpen(true)
    },
    [],
  )

  const removeFromCart = useCallback(
    (productId: string, color: string, size?: string) => {
      setCartItems((prev) =>
        prev.filter((p) => !sameLine(p, productId, color, size)),
      )
    },
    [],
  )

  const updateQuantity = useCallback(
    (productId: string, color: string, quantity: number, size?: string) => {
      setCartItems((prev) =>
        prev
          .map((p) =>
            sameLine(p, productId, color, size) ? { ...p, quantity } : p,
          )
          .filter((p) => p.quantity > 0),
      )
    },
    [],
  )

  const clearCart = useCallback(() => setCartItems([]), [])

  const cartCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
    [cartItems],
  )

  const subtotal = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cartItems],
  )

  const shipping = useMemo(
    () =>
      orderShippingTotal(
        cartItems as (ShippingRates & { quantity?: number })[],
        shipRegion,
      ),
    [cartItems, shipRegion],
  )

  const total = subtotal + shipping

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      subtotal,
      shipping,
      total,
      shipRegion,
      setShipRegion,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      isCartOpen,
      setCartOpen,
    }),
    [
      cartItems,
      cartCount,
      subtotal,
      shipping,
      total,
      shipRegion,
      setShipRegion,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      isCartOpen,
    ],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
