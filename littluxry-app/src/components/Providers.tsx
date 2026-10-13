'use client'

import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { ProductsProvider } from '@/context/ProductsContext'
import { UIProvider } from '@/context/UIContext'
import { ToastProvider } from '@/lib/toast'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProductsProvider>
        <CartProvider>
          <UIProvider>
            <ToastProvider>{children}</ToastProvider>
          </UIProvider>
        </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  )
}
