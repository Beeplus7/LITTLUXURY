'use client'

import { AuthProvider } from '@/context/AuthContext'
import { CartProvider } from '@/context/CartContext'
import { ProductsProvider } from '@/context/ProductsContext'
import { SupportMessagesProvider } from '@/context/SupportMessagesContext'
import { UIProvider } from '@/context/UIContext'
import { CartRecoveryReminder } from '@/components/CartRecoveryReminder'
import { ToastProvider } from '@/lib/toast'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ProductsProvider>
        <CartProvider>
          <SupportMessagesProvider>
            <UIProvider>
              <ToastProvider>
                {children}
                <CartRecoveryReminder />
              </ToastProvider>
            </UIProvider>
          </SupportMessagesProvider>
        </CartProvider>
      </ProductsProvider>
    </AuthProvider>
  )
}
