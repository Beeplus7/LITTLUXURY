'use client'

import { useState } from 'react'
import { useProducts } from '@/context/ProductsContext'
import type { Product, ProductVariant } from '@/data/products'
import { useToast } from '@/lib/toast'
import { X } from 'lucide-react'

export default function DashboardProductsPage() {
  const { products, updateProduct, addVariant } = useProducts()
  const { toast } = useToast()
  const [editing, setEditing] = useState<Product | null>(null)
  const [variantForm, setVariantForm] = useState({
    color: '',
    hex: '#d9c5b4',
    price: 298,
    stock: 10,
    sku: '',
  })

  return (
    <div>
      <h1 className="serif text-3xl">Products</h1>
      <p className="mt-1 text-sm text-[#b8b0a4]">
        Edits sync to shop & homepage via ProductsContext.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-[#b8b0a4]">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Variants</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-white/10">
                <td className="px-4 py-3">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-[12px] text-[#b8b0a4]">{p.id}</p>
                </td>
                <td className="px-4 py-3 capitalize text-[#b8b0a4]">
                  {(p.shopCategory ?? 'women').replace(/-/g, ' ')}
                </td>
                <td className="px-4 py-3 text-[#D4AF37]">${p.price}</td>
                <td className="px-4 py-3">{p.variants.length}</td>
                <td className="px-4 py-3">
                  {p.variants.reduce((s, v) => s + v.stock, 0)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-wider"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="serif text-2xl">Edit product</h2>
              <button type="button" onClick={() => setEditing(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-[12px] text-[#b8b0a4] sm:col-span-2">
                Name
                <input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-[12px] text-[#b8b0a4] sm:col-span-2">
                Description
                <textarea
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-[12px] text-[#b8b0a4]">
                Price
                <input
                  type="number"
                  value={editing.price}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      price: Number(e.target.value) || 0,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-[12px] text-[#b8b0a4]">
                Media upload
                <input
                  type="file"
                  accept="image/*,video/mp4"
                  className="mt-1 w-full text-sm"
                  onChange={() => toast('Media attached (demo local)')}
                />
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 p-4">
              <h3 className="mb-3 text-sm font-semibold">Variants builder</h3>
              <div className="grid gap-2 sm:grid-cols-5">
                {(
                  [
                    ['color', 'Color'],
                    ['hex', 'Hex'],
                    ['price', 'Price'],
                    ['stock', 'Stock'],
                    ['sku', 'SKU'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="text-[11px] text-[#b8b0a4]">
                    {label}
                    <input
                      value={String(variantForm[key])}
                      onChange={(e) =>
                        setVariantForm((f) => ({
                          ...f,
                          [key]:
                            key === 'price' || key === 'stock'
                              ? Number(e.target.value)
                              : e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black px-2 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 rounded-full border border-[#D4AF37]/40 px-4 py-2 text-[11px] uppercase tracking-wider text-[#D4AF37]"
                onClick={() => {
                  if (!variantForm.color) return
                  const v: ProductVariant = {
                    id: `${editing.id}-${variantForm.color.toLowerCase()}-${Date.now()}`,
                    color: variantForm.color,
                    hex: variantForm.hex,
                    price: Number(variantForm.price),
                    stock: Number(variantForm.stock),
                    sku:
                      variantForm.sku ||
                      `LL-${variantForm.color.slice(0, 3).toUpperCase()}`,
                  }
                  addVariant(editing.id, v)
                  setEditing({
                    ...editing,
                    variants: [...editing.variants, v],
                  })
                  toast('Variant added')
                }}
              >
                Add variant
              </button>
              <ul className="mt-3 space-y-1 text-[12px] text-[#b8b0a4]">
                {editing.variants.map((v) => (
                  <li key={v.id}>
                    {v.color} · {v.hex} · ${v.price} · stock {v.stock} · {v.sku}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-full bg-[#D4AF37] py-3 text-[12px] font-semibold uppercase tracking-wider text-black"
              onClick={() => {
                updateProduct(editing.id, editing)
                toast('Product saved — shop updated')
                setEditing(null)
              }}
            >
              Save changes
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
