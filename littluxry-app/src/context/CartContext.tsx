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

export type CartItem = {
  productId: string
  name: string
  price: number
  color: string
  quantity: number
  image?: string
}

type CartContextValue = {
  cartItems: CartItem[]
  cartCount: number
  total: number
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeFromCart: (productId: string, color: string) => void
  updateQuantity: (productId: string, color: string, quantity: number) => void
  clearCart: () => void
  isCartOpen: boolean
  setCartOpen: (open: boolean) => void
}

const STORAGE_KEY = 'littluxry_cart'
const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isCartOpen, setCartOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setCartItems(JSON.parse(raw) as CartItem[])
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems))
  }, [cartItems, hydrated])

  const addToCart = useCallback(
    (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
      const qty = item.quantity ?? 1
      setCartItems((prev) => {
        const idx = prev.findIndex(
          (p) => p.productId === item.productId && p.color === item.color,
        )
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = { ...next[idx], quantity: next[idx].quantity + qty }
          return next
        }
        return [...prev, { ...item, quantity: qty }]
      })
      setCartOpen(true)
    },
    [],
  )

  const removeFromCart = useCallback((productId: string, color: string) => {
    setCartItems((prev) =>
      prev.filter((p) => !(p.productId === productId && p.color === color)),
    )
  }, [])

  const updateQuantity = useCallback(
    (productId: string, color: string, quantity: number) => {
      setCartItems((prev) =>
        prev
          .map((p) =>
            p.productId === productId && p.color === color
              ? { ...p, quantity }
              : p,
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
  const total = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [cartItems],
  )

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      total,
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
      total,
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
