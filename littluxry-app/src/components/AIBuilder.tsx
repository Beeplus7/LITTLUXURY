'use client'

import { useState } from 'react'
import { Sparkles, Send } from 'lucide-react'
import { useProducts } from '@/context/ProductsContext'
import { useToast } from '@/lib/toast'
import type { ProductVariant } from '@/data/products'

type Msg = { role: 'user' | 'assistant'; text: string }

const COLOR_MAP: Record<string, string> = {
  beige: '#d9c5b4',
  oat: '#d9c5b4',
  emerald: '#1a7a4c',
  green: '#1a7a4c',
  pink: '#e8a0bf',
  blush: '#e8a0bf',
  black: '#111111',
  noir: '#111111',
  white: '#f5f5f5',
  blanc: '#f5f5f5',
  red: '#c1272d',
  rosso: '#c1272d',
}

export function AIBuilder({ productId }: { productId?: string }) {
  const { products, addVariant, getProduct } = useProducts()
  const { toast } = useToast()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'AI Shop Builder ready. Try: “Create beige variant” or “Add emerald green variant”.',
    },
  ])

  function handlePrompt(raw: string) {
    const prompt = raw.trim()
    if (!prompt) return
    setMessages((m) => [...m, { role: 'user', text: prompt }])
    setInput('')

    const lower = prompt.toLowerCase()
    const colorKey = Object.keys(COLOR_MAP).find((k) => lower.includes(k))
    const targetId =
      productId ??
      products.find((p) => p.category === 'fringe')?.id ??
      products[0]?.id

    if (!targetId || !colorKey) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: 'I can create color variants. Mention a color like beige, emerald, blush, or noir.',
        },
      ])
      return
    }

    const product = getProduct(targetId)
    if (!product) return

    const colorName = colorKey.charAt(0).toUpperCase() + colorKey.slice(1)
    const hex = COLOR_MAP[colorKey]
    const variant: ProductVariant = {
      id: `${product.id}-${colorKey}-${Date.now()}`,
      color: colorName,
      hex,
      price: product.price,
      stock: 10,
      sku: `LL-AI-${colorKey.slice(0, 3).toUpperCase()}`,
    }

    addVariant(product.id, variant)

    const reply = `Created ${colorName} variant for ${product.menuLabel} — $${variant.price}, SKU ${variant.sku}. It’s live in Products.`
    setMessages((m) => [...m, { role: 'assistant', text: reply }])
    toast(`${colorName} variant added`)
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Sparkles size={16} className="text-[#D4AF37]" />
        <h3 className="text-sm font-semibold">AI Shop Builder</h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'user'
                ? 'ml-8 rounded-2xl bg-[#D4AF37]/15 px-3 py-2 text-[#f5f0e8]'
                : 'mr-8 rounded-2xl bg-zinc-900 px-3 py-2 text-[#b8b0a4]'
            }
          >
            {m.text}
          </div>
        ))}
      </div>
      <form
        className="flex gap-2 border-t border-white/10 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          handlePrompt(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='e.g. "Add emerald green variant"'
          className="flex-1 rounded-full border border-white/10 bg-black px-4 py-2 text-sm outline-none focus:border-[#D4AF37]/50"
        />
        <button
          type="submit"
          className="grid h-10 w-10 place-items-center rounded-full bg-[#D4AF37] text-black transition hover:brightness-110"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
