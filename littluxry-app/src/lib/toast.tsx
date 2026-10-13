'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Check } from 'lucide-react'

type ToastContextValue = {
  toast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const toast = useCallback((msg: string) => {
    setMessage(msg)
    window.setTimeout(() => setMessage(null), 2800)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 left-1/2 z-[100] w-full max-w-[420px] -translate-x-1/2 pointer-events-none px-4">
        {message ? (
          <div className="mx-auto flex items-center justify-center gap-2 rounded-full bg-[#f5f3ef] px-5 py-3 text-[13px] font-medium tracking-wide text-black shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#D4AF37]">
              <Check size={12} />
            </span>
            <span className="truncate">{message}</span>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
