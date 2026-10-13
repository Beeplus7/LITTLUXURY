'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Copy,
  Pencil,
  Plus,
  Trash2,
  X,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useProducts } from '@/context/ProductsContext'
import {
  COLOR_SWATCHES,
  productLineForShopCategory,
  sizesForShopCategory,
  slugify,
  type Product,
  type ProductLine,
  type ProductVariant,
} from '@/data/products'
import { SHOP_CATEGORIES, type ShopCategoryId } from '@/data/categories'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

type EditorMode = 'create' | 'edit'

type DraftVariant = {
  key: string
  color: string
  hex: string
  size: string
  price: number
  stock: number
  sku: string
}

function emptyProduct(): Product {
  return {
    id: '',
    slug: '',
    name: '',
    menuLabel: '',
    price: 198,
    original: 248,
    rating: 5,
    reviewCount: 0,
    description: '',
    colors: [],
    features: [],
    images: ['/assets/fringe-hero.png'],
    gradient: 'from-[#1a1a1a] via-[#2a2a2a] to-[#0a0a0a]',
    category: 'tote',
    productLine: 'tote',
    shopCategory: 'women-bags',
    variants: [],
  }
}

function toDraftVariants(product: Product): DraftVariant[] {
  return product.variants.map((v, i) => ({
    key: v.id || `v-${i}`,
    color: v.color,
    hex: v.hex,
    size: v.size || 'OS',
    price: v.price,
    stock: v.stock,
    sku: v.sku,
  }))
}

function ProductEditorModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: EditorMode
  initial: Product
  onClose: () => void
  onSave: (product: Product) => void
}) {
  const { toast } = useToast()
  const [form, setForm] = useState<Product>(initial)
  const [variants, setVariants] = useState<DraftVariant[]>(() =>
    toDraftVariants(initial),
  )
  const [featureText, setFeatureText] = useState(
    (initial.features || []).join('\n'),
  )
  const [variantDraft, setVariantDraft] = useState({
    color: 'Black',
    hex: '#111111',
    size: sizesForShopCategory(initial.shopCategory)[0] || 'OS',
    price: initial.price || 198,
    stock: 10,
    sku: '',
  })

  const sizeOptions = useMemo(
    () => sizesForShopCategory(form.shopCategory),
    [form.shopCategory],
  )

  useEffect(() => {
    setVariantDraft((d) => ({
      ...d,
      size: sizeOptions.includes(d.size) ? d.size : sizeOptions[0] || 'OS',
    }))
  }, [sizeOptions])

  function patchForm(patch: Partial<Product>) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function addVariantRow() {
    if (!variantDraft.color.trim()) {
      toast('Add a color for the variant')
      return
    }
    const key = `v-${Date.now()}`
    setVariants((prev) => [
      ...prev,
      {
        key,
        color: variantDraft.color.trim(),
        hex: variantDraft.hex || '#111111',
        size: variantDraft.size || 'OS',
        price: Number(variantDraft.price) || form.price,
        stock: Number(variantDraft.stock) || 0,
        sku:
          variantDraft.sku.trim() ||
          `LL-${slugify(variantDraft.color).slice(0, 3).toUpperCase()}-${variantDraft.size}`,
      },
    ])
  }

  function removeVariantRow(key: string) {
    setVariants((prev) => prev.filter((v) => v.key !== key))
  }

  function save() {
    if (!form.name.trim()) {
      toast('Product name is required')
      return
    }
    const baseSlug = slugify(form.name) || `product-${Date.now()}`
    const id = form.id || baseSlug
    const slug = form.slug || baseSlug
    const line: ProductLine =
      form.productLine || productLineForShopCategory(form.shopCategory)

    const finalVariants: ProductVariant[] = (
      variants.length
        ? variants
        : [
            {
              key: 'default',
              color: 'Default',
              hex: '#111111',
              size: sizeOptions[0] || 'OS',
              price: form.price,
              stock: 10,
              sku: `LL-${baseSlug.slice(0, 6).toUpperCase()}`,
            },
          ]
    ).map((v) => ({
      id: `${id}-${slugify(v.color)}-${slugify(v.size)}-${v.key.slice(-4)}`,
      color: v.color,
      hex: v.hex,
      size: v.size,
      price: v.price,
      stock: v.stock,
      sku: v.sku,
    }))

    const colors = Array.from(
      new Map(
        finalVariants.map((v) => [
          v.color,
          { name: v.color, hex: v.hex, label: v.color },
        ]),
      ).values(),
    )

    const product: Product = {
      ...form,
      id,
      slug,
      name: form.name.trim(),
      menuLabel: form.menuLabel.trim() || form.name.trim(),
      price: Number(form.price) || finalVariants[0]?.price || 0,
      original: Number(form.original) || Number(form.price) || 0,
      description: form.description.trim(),
      features: featureText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      colors,
      variants: finalVariants,
      category: line,
      productLine: line,
      shopCategory: form.shopCategory,
      images: form.images.length ? form.images : ['/assets/fringe-hero.png'],
    }
    onSave(product)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#D4AF37]">
              Manual entry
            </p>
            <h2 className="serif text-2xl">
              {mode === 'create' ? 'New product' : 'Edit product'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-[#b8b0a4] hover:bg-white/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[12px] text-[#b8b0a4] sm:col-span-2">
            Name
            <input
              value={form.name}
              onChange={(e) => {
                const name = e.target.value
                patchForm({
                  name,
                  menuLabel: form.menuLabel || name,
                  slug: mode === 'create' ? slugify(name) : form.slug,
                })
              }}
              placeholder="e.g. Fringe Muse Hobo"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4]">
            Menu label
            <input
              value={form.menuLabel}
              onChange={(e) => patchForm({ menuLabel: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4]">
            Shop category
            <select
              value={form.shopCategory}
              onChange={(e) => {
                const shopCategory = e.target.value as ShopCategoryId
                const productLine = productLineForShopCategory(shopCategory)
                patchForm({
                  shopCategory,
                  productLine,
                  category: productLine,
                })
              }}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            >
              {SHOP_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[12px] text-[#b8b0a4] sm:col-span-2">
            Description
            <textarea
              value={form.description}
              onChange={(e) => patchForm({ description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4]">
            Price
            <input
              type="number"
              value={form.price}
              onChange={(e) =>
                patchForm({ price: Number(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4]">
            Compare-at price
            <input
              type="number"
              value={form.original}
              onChange={(e) =>
                patchForm({ original: Number(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4] sm:col-span-2">
            Features (one per line)
            <textarea
              value={featureText}
              onChange={(e) => setFeatureText(e.target.value)}
              rows={3}
              placeholder="Italian leather&#10;Dust bag included"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4] sm:col-span-2">
            Image URL
            <input
              value={form.images[0] || ''}
              onChange={(e) =>
                patchForm({
                  images: e.target.value
                    ? [e.target.value, ...form.images.slice(1)]
                    : form.images,
                })
              }
              placeholder="/assets/… or https://…"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Variants · color & size</h3>
            <p className="text-[11px] text-[#6a655c]">
              Sizes for {form.shopCategory.replace(/-/g, ' ')}
            </p>
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                onClick={() =>
                  setVariantDraft((d) => ({
                    ...d,
                    color: c.name,
                    hex: c.hex,
                  }))
                }
                className={cn(
                  'h-7 w-7 rounded-full border',
                  variantDraft.color === c.name
                    ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/40'
                    : 'border-white/20',
                )}
                style={{ background: c.hex }}
              />
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-6">
            <label className="text-[11px] text-[#b8b0a4] sm:col-span-2">
              Color
              <input
                value={variantDraft.color}
                onChange={(e) =>
                  setVariantDraft((d) => ({ ...d, color: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-[11px] text-[#b8b0a4]">
              Hex
              <input
                value={variantDraft.hex}
                onChange={(e) =>
                  setVariantDraft((d) => ({ ...d, hex: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-[11px] text-[#b8b0a4]">
              Size
              <select
                value={variantDraft.size}
                onChange={(e) =>
                  setVariantDraft((d) => ({ ...d, size: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-2 py-1.5 text-sm"
              >
                {sizeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] text-[#b8b0a4]">
              Price
              <input
                type="number"
                value={variantDraft.price}
                onChange={(e) =>
                  setVariantDraft((d) => ({
                    ...d,
                    price: Number(e.target.value) || 0,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-2 py-1.5 text-sm"
              />
            </label>
            <label className="text-[11px] text-[#b8b0a4]">
              Stock
              <input
                type="number"
                value={variantDraft.stock}
                onChange={(e) =>
                  setVariantDraft((d) => ({
                    ...d,
                    stock: Number(e.target.value) || 0,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <label className="mt-2 block text-[11px] text-[#b8b0a4]">
            SKU (optional)
            <input
              value={variantDraft.sku}
              onChange={(e) =>
                setVariantDraft((d) => ({ ...d, sku: e.target.value }))
              }
              className="mt-1 w-full rounded-lg border border-white/10 bg-black px-2 py-1.5 text-sm"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addVariantRow}
              className="rounded-full border border-[#D4AF37]/40 px-4 py-2 text-[11px] uppercase tracking-wider text-[#D4AF37]"
            >
              Add variant
            </button>
            <button
              type="button"
              onClick={() => {
                const rows: DraftVariant[] = sizeOptions.map((size) => ({
                  key: `bulk-${size}-${Date.now()}`,
                  color: variantDraft.color || 'Black',
                  hex: variantDraft.hex || '#111111',
                  size,
                  price: Number(variantDraft.price) || form.price,
                  stock: Number(variantDraft.stock) || 10,
                  sku: `LL-${slugify(variantDraft.color || 'blk')
                    .slice(0, 3)
                    .toUpperCase()}-${size}`,
                }))
                setVariants((prev) => [...prev, ...rows])
                toast(`Added ${rows.length} size variants`)
              }}
              className="rounded-full border border-white/15 px-4 py-2 text-[11px] uppercase tracking-wider text-[#b8b0a4]"
            >
              Add all sizes
            </button>
          </div>

          <ul className="mt-4 space-y-2">
            {variants.length === 0 ? (
              <li className="text-[12px] text-[#6a655c]">
                No variants yet — add color/size rows, or a default will be
                created on save.
              </li>
            ) : (
              variants.map((v) => (
                <li
                  key={v.key}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[12px]"
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-white/20"
                    style={{ background: v.hex }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[#e8e6e1]">
                    {v.color} · size {v.size} · ${v.price} · stock {v.stock} ·{' '}
                    {v.sku}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeVariantRow(v.key)}
                    className="text-[#8a8a8a] hover:text-red-300"
                    aria-label="Remove variant"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <button
          type="button"
          onClick={save}
          className="mt-5 w-full rounded-full bg-[#D4AF37] py-3 text-[12px] font-semibold uppercase tracking-wider text-black"
        >
          {mode === 'create' ? 'Create product' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

function ProductsPageInner() {
  const {
    products,
    updateProduct,
    addProduct,
    removeProduct,
    duplicateProduct,
  } = useProducts()
  const { toast } = useToast()
  const router = useRouter()
  const params = useSearchParams()
  const [editor, setEditor] = useState<{
    mode: EditorMode
    product: Product
  } | null>(null)

  useEffect(() => {
    if (params.get('new') === '1') {
      setEditor({ mode: 'create', product: emptyProduct() })
      router.replace('/dashboard/products')
    }
  }, [params, router])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="serif text-3xl">Products</h1>
          <p className="mt-1 text-sm text-[#b8b0a4]">
            Manual catalog edits sync to shop & homepage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/ai"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-[12px] text-[#b8b0a4]"
          >
            <Sparkles size={14} className="text-[#D4AF37]" />
            AI Builder
          </Link>
          <button
            type="button"
            onClick={() =>
              setEditor({ mode: 'create', product: emptyProduct() })
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-[#D4AF37] px-4 py-2.5 text-[12px] font-semibold text-black"
          >
            <Plus size={14} />
            Add new product
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-[#b8b0a4]">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Variants</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-white/10">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.images[0]}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10"
                    />
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-[12px] text-[#b8b0a4]">{p.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-[#b8b0a4]">
                  {(p.shopCategory ?? 'women').replace(/-/g, ' ')}
                </td>
                <td className="px-4 py-3 text-[#D4AF37]">${p.price}</td>
                <td className="px-4 py-3">{p.variants.length}</td>
                <td className="px-4 py-3">
                  {p.variants.reduce((s, v) => s + v.stock, 0)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setEditor({ mode: 'edit', product: { ...p } })
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-wider"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = duplicateProduct(p.id)
                        if (copy) {
                          toast('Product duplicated')
                          setEditor({ mode: 'edit', product: copy })
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#b8b0a4]"
                    >
                      <Copy size={12} />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Delete “${p.name}”? This removes it from the shop.`,
                          )
                        ) {
                          return
                        }
                        removeProduct(p.id)
                        toast('Product deleted')
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-red-400/30 px-3 py-1.5 text-[11px] uppercase tracking-wider text-red-300"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editor ? (
        <ProductEditorModal
          mode={editor.mode}
          initial={editor.product}
          onClose={() => setEditor(null)}
          onSave={(product) => {
            if (editor.mode === 'create') {
              addProduct(product)
              toast('Product created')
            } else {
              updateProduct(product.id, product)
              toast('Product saved — shop updated')
            }
            setEditor(null)
          }}
        />
      ) : null}
    </div>
  )
}

export default function DashboardProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[40vh] place-items-center text-[#b8b0a4]">
          Loading products…
        </div>
      }
    >
      <ProductsPageInner />
    </Suspense>
  )
}
