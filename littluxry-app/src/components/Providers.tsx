'use client'

import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { ProductsProvider } from '@/context/ProductsContext'
import { SupportMessagesProvider } from '@/context/SupportMessagesContext'
import { UIProvider } from '@/context/UIContext'
import { ToastProvider } from '@/lib/toast'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProductsProvider>
        <CartProvider>
          <SupportMessagesProvider>
            <UIProvider>
              <ToastProvider>{children}</ToastProvider>
            </UIProvider>
          </SupportMessagesProvider>
        </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  )
}
