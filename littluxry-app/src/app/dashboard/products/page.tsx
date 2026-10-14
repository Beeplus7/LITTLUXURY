'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Copy,
  Film,
  ImagePlus,
  Library,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useProducts } from '@/context/ProductsContext'
import {
  COLOR_SWATCHES,
  isDraftProduct,
  isPublishedProduct,
  productLineForShopCategory,
  sizesForShopCategory,
  slugify,
  type Product,
  type ProductLine,
  type ProductVariant,
} from '@/data/products'
import { SHOP_CATEGORIES, type ShopCategoryId } from '@/data/categories'
import { MediaPickerModal } from '@/components/MediaPickerModal'
import { ProductMedia } from '@/components/ProductMedia'
import type { MediaItem } from '@/data/media'
import {
  isLocalMediaRef,
  isVideoSrc,
  persistInlineMediaSrcs,
  saveLocalImage,
  saveLocalVideo,
} from '@/lib/localMediaStore'
import { useToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

type EditorMode = 'create' | 'edit'

/** Max gallery images per product (library + uploads). */
const MAX_PRODUCT_IMAGES = 24

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
    images: [],
    gradient: 'from-[#1a1a1a] via-[#2a2a2a] to-[#0a0a0a]',
    category: 'tote',
    productLine: 'tote',
    shopCategory: 'women-bags',
    variants: [],
    video: undefined,
    status: 'draft',
    brand: 'Litt Luxury',
    tags: [],
    materials: '',
    care: '',
    sku: '',
    barcode: '',
    cost: undefined,
    weightGrams: undefined,
    seoTitle: '',
    seoDescription: '',
    shippingNote:
      'Tracked shipping to Europe and USA only. Dispatch from our atelier.',
    returnsNote:
      '30-day returns on unused items in original packaging.',
    processingDays: 2,
    shippingEurope: 18,
    shippingUsa: 22,
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
  onSave: (
    product: Product,
    opts: { publish: boolean },
  ) => boolean | void
}) {
  const { toast } = useToast()
  const imageRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<Product>(initial)
  const [variants, setVariants] = useState<DraftVariant[]>(() =>
    toDraftVariants(initial),
  )
  const [featureText, setFeatureText] = useState(
    (initial.features || []).join('\n'),
  )
  const [tagsText, setTagsText] = useState((initial.tags || []).join(', '))
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [imageUrlDraft, setImageUrlDraft] = useState('')
  const [customColourOpen, setCustomColourOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const customColourNameRef = useRef<HTMLInputElement>(null)
  const [variantDraft, setVariantDraft] = useState({
    color: 'Black',
    hex: '#111111',
    size: sizesForShopCategory(initial.shopCategory)[0] || 'OS',
    price: initial.price || 198,
    stock: 10,
    sku: '',
  })
  const isPresetColour = COLOR_SWATCHES.some(
    (c) => c.name === variantDraft.color && c.hex === variantDraft.hex,
  )
  const customColourActive = customColourOpen || !isPresetColour

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

  function addImages(urls: string[]) {
    if (!urls.length) return
    setForm((f) => ({
      ...f,
      images: [...f.images, ...urls]
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, MAX_PRODUCT_IMAGES),
    }))
  }

  function removeImage(src: string) {
    setForm((f) => ({
      ...f,
      images: f.images.filter((img) => img !== src),
    }))
  }

  function addFromLibrary(items: MediaItem[]) {
    if (!items.length) return
    const imageSrcs = items.filter((m) => m.type === 'image').map((m) => m.src)
    const video = items.find((m) => m.type === 'video')?.src
    const videoSrcs = items.filter((m) => m.type === 'video').map((m) => m.src)
    const labelHint = (items[0]?.label ?? '')
      .replace(/[-_]+/g, ' ')
      .trim()
    setForm((f) => {
      const merged = [...f.images, ...imageSrcs, ...videoSrcs]
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, MAX_PRODUCT_IMAGES)
      return {
        ...f,
        name: f.name || labelHint,
        images: merged,
        video: video ?? f.video,
      }
    })
    setLibraryOpen(false)
    const parts = [
      imageSrcs.length
        ? `${imageSrcs.length} image${imageSrcs.length === 1 ? '' : 's'}`
        : null,
      videoSrcs.length
        ? `${videoSrcs.length} video${videoSrcs.length === 1 ? '' : 's'}`
        : null,
    ].filter(Boolean)
    toast(`Added ${parts.join(' + ')} from library`)
  }

  async function onUploadImages(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const room = Math.max(0, MAX_PRODUCT_IMAGES - form.images.length)
      if (!room) {
        toast(`Image limit reached (${MAX_PRODUCT_IMAGES})`)
        return
      }
      const loaded: string[] = []
      for (const file of Array.from(files).slice(0, room)) {
        // IndexedDB refs — data URLs get stripped from localStorage on publish
        loaded.push(await saveLocalImage(file))
      }
      addImages(loaded)
      if (!form.name && files[0]) {
        patchForm({
          name: files[0].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        })
      }
      toast(`${loaded.length} image${loaded.length === 1 ? '' : 's'} uploaded`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Image upload failed')
    } finally {
      setUploading(false)
      if (imageRef.current) imageRef.current.value = ''
    }
  }

  async function onUploadVideo(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploadingVideo(true)
    try {
      // Store in IndexedDB so publish works (data URLs get stripped from localStorage)
      const ref = await saveLocalVideo(file)
      setForm((f) => {
        const images = [...f.images.filter((src) => src !== f.video), ref]
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, MAX_PRODUCT_IMAGES)
        return {
          ...f,
          video: ref,
          images,
          name:
            f.name ||
            file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        }
      })
      toast('Video uploaded — it will show in the product gallery')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Video upload failed')
    } finally {
      setUploadingVideo(false)
      if (videoRef.current) videoRef.current.value = ''
    }
  }

  async function buildProduct(publish: boolean): Promise<Product | null> {
    if (!form.name.trim()) {
      setFormError('Product name is required')
      return null
    }

    // Move any legacy data-URL media into IndexedDB before catalog persist
    let images = await persistInlineMediaSrcs([...form.images])
    let video = form.video
    if (video?.startsWith('data:') && !isLocalMediaRef(video)) {
      const [migrated] = await persistInlineMediaSrcs([video])
      video = migrated || undefined
      if (!video) {
        toast('Re-upload video with Upload video so it publishes correctly')
      }
    } else if (video) {
      const [kept] = await persistInlineMediaSrcs([video])
      video = kept || video
    }

    // Ensure product video also appears in the image gallery container
    if (video && !images.includes(video)) {
      images = [...images, video].slice(0, MAX_PRODUCT_IMAGES)
    } else {
      images = images.slice(0, MAX_PRODUCT_IMAGES)
    }

    if (!images.length && !video) {
      setFormError('Add at least one image or video before saving')
      toast('Add media before publishing — uploads are no longer replaced with defaults')
      return null
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
      id: `${id}-${slugify(v.color) || 'clr'}-${slugify(v.size) || 'sz'}-${v.key.slice(-4)}`,
      color: v.color || 'Default',
      hex: v.hex || '#111111',
      size: v.size || 'OS',
      price: Number(v.price) || Number(form.price) || 0,
      stock: Number(v.stock) || 0,
      sku: v.sku || `LL-${baseSlug.slice(0, 6).toUpperCase()}`,
    }))

    const colorMap = new Map<
      string,
      { name: string; hex: string; label: string }
    >()
    for (const v of finalVariants) {
      if (!colorMap.has(v.color)) {
        colorMap.set(v.color, {
          name: v.color,
          hex: v.hex,
          label: v.color,
        })
      }
    }
    const colors = Array.from(colorMap.values())

    setFormError(null)
    return {
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
      images,
      video: video || undefined,
      status: publish ? 'published' : 'draft',
      brand: (form.brand || 'Litt Luxury').trim(),
      tags: tagsText
        .split(/[,#]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 24),
      materials: (form.materials || '').trim(),
      care: (form.care || '').trim(),
      sku: (form.sku || '').trim() || undefined,
      barcode: (form.barcode || '').trim() || undefined,
      cost:
        form.cost != null && !Number.isNaN(Number(form.cost))
          ? Number(form.cost)
          : undefined,
      weightGrams: form.weightGrams
        ? Number(form.weightGrams) || undefined
        : undefined,
      seoTitle: (form.seoTitle || '').trim() || undefined,
      seoDescription: (form.seoDescription || '').trim() || undefined,
      shippingNote: (form.shippingNote || '').trim() || undefined,
      returnsNote: (form.returnsNote || '').trim() || undefined,
      processingDays:
        form.processingDays != null
          ? Math.max(0, Number(form.processingDays) || 0)
          : 2,
      shippingEurope: Math.max(
        0,
        Number(form.shippingEurope ?? 18) || 0,
      ),
      shippingUsa: Math.max(0, Number(form.shippingUsa ?? 22) || 0),
    }
  }

  async function save(publish: boolean) {
    if (busy) return
    setBusy(true)
    try {
      const product = await buildProduct(publish)
      if (!product) return
      // Keep form ids in sync so Save → Publish works on the same product
      setForm((f) => ({
        ...f,
        id: product.id,
        slug: product.slug,
        images: product.images,
        video: product.video,
      }))
      const ok = onSave(product, { publish })
      if (ok === false) {
        setFormError(
          'Could not publish — device storage is full. Prefer Upload (IndexedDB) or library paths.',
        )
        toast('Publish failed — re-upload images with Upload')
      }
    } finally {
      setBusy(false)
    }
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
          <label className="block text-[12px] text-[#b8b0a4]">
            Brand / vendor
            <input
              value={form.brand || ''}
              onChange={(e) => patchForm({ brand: e.target.value })}
              placeholder="Litt Luxury"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4]">
            URL handle (slug)
            <input
              value={form.slug}
              onChange={(e) => patchForm({ slug: slugify(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm font-mono"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4]">
            Cost (admin)
            <input
              type="number"
              value={form.cost ?? ''}
              onChange={(e) =>
                patchForm({
                  cost: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              placeholder="Your cost"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4]">
            Weight (grams)
            <input
              type="number"
              value={form.weightGrams ?? ''}
              onChange={(e) =>
                patchForm({
                  weightGrams:
                    e.target.value === ''
                      ? undefined
                      : Number(e.target.value) || undefined,
                })
              }
              placeholder="e.g. 480"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4]">
            Product SKU
            <input
              value={form.sku || ''}
              onChange={(e) => patchForm({ sku: e.target.value })}
              placeholder="LL-…"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4]">
            Barcode / GTIN
            <input
              value={form.barcode || ''}
              onChange={(e) => patchForm({ barcode: e.target.value })}
              placeholder="Optional UPC/EAN"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4] sm:col-span-2">
            Tags (comma separated)
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="leather, hobo, gift"
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
            Materials
            <textarea
              value={form.materials || ''}
              onChange={(e) => patchForm({ materials: e.target.value })}
              rows={2}
              placeholder="Full-grain Italian leather, gold-tone hardware…"
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-[12px] text-[#b8b0a4] sm:col-span-2">
            Care instructions
            <textarea
              value={form.care || ''}
              onChange={(e) => patchForm({ care: e.target.value })}
              rows={2}
              placeholder="Wipe with soft cloth. Store in dust bag."
              className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 p-4">
          <h3 className="mb-3 text-sm font-semibold">Shipping & returns</h3>
          <p className="mb-3 text-[11px] text-[#6a655c]">
            We ship to Europe and USA only. Set flat rates shown on the product
            page and at checkout.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] text-[#b8b0a4]">
              Ship to Europe ($)
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.shippingEurope ?? 18}
                onChange={(e) =>
                  patchForm({
                    shippingEurope:
                      e.target.value === ''
                        ? 0
                        : Number(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-[12px] text-[#b8b0a4]">
              Ship to USA ($)
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.shippingUsa ?? 22}
                onChange={(e) =>
                  patchForm({
                    shippingUsa:
                      e.target.value === ''
                        ? 0
                        : Number(e.target.value) || 0,
                  })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-[12px] text-[#b8b0a4]">
              Processing days
              <input
                type="number"
                min={0}
                value={form.processingDays ?? 2}
                onChange={(e) =>
                  patchForm({ processingDays: Number(e.target.value) || 0 })
                }
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-[12px] text-[#b8b0a4] sm:col-span-2">
              Shipping note
              <textarea
                value={form.shippingNote || ''}
                onChange={(e) => patchForm({ shippingNote: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-[12px] text-[#b8b0a4] sm:col-span-2">
              Returns note
              <textarea
                value={form.returnsNote || ''}
                onChange={(e) => patchForm({ returnsNote: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 p-4">
          <h3 className="mb-3 text-sm font-semibold">Search engine listing</h3>
          <div className="grid gap-3">
            <label className="block text-[12px] text-[#b8b0a4]">
              SEO title
              <input
                value={form.seoTitle || ''}
                onChange={(e) => patchForm({ seoTitle: e.target.value })}
                placeholder={form.name || 'Page title for Google'}
                maxLength={70}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-[12px] text-[#b8b0a4]">
              Meta description
              <textarea
                value={form.seoDescription || ''}
                onChange={(e) => patchForm({ seoDescription: e.target.value })}
                placeholder="Short description for search results"
                maxLength={160}
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
              />
            </label>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-[12px]">
              <p className="text-[#6a655c]">Preview</p>
              <p className="mt-1 text-[#7aa7ff]">
                {(form.seoTitle || form.name || 'Product').slice(0, 70)}
              </p>
              <p className="text-[11px] text-emerald-500/80">
                litt-luxury.com/shop/{form.slug || 'product'}
              </p>
              <p className="mt-1 text-[#b8b0a4]">
                {(
                  form.seoDescription ||
                  form.description ||
                  'Premium piece from Litt Luxury.'
                ).slice(0, 160)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Media</h3>
            <p className="text-[11px] text-[#6a655c]">
              Up to {MAX_PRODUCT_IMAGES} images · library · upload · video
              {form.images.length
                ? ` · ${form.images.length}/${MAX_PRODUCT_IMAGES}`
                : ''}
            </p>
          </div>

          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void onUploadImages(e.target.files)}
          />
          <input
            ref={videoRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            className="hidden"
            onChange={(e) => void onUploadVideo(e.target.files)}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#D4AF37]"
            >
              <Library size={13} />
              From library
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => imageRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#b8b0a4] disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <ImagePlus size={13} />
              )}
              Upload image
            </button>
            <button
              type="button"
              disabled={uploadingVideo}
              onClick={() => videoRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#b8b0a4] disabled:opacity-50"
            >
              {uploadingVideo ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Film size={13} />
              )}
              Upload video
            </button>
          </div>

          {form.images.length || form.video ? (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {form.images.map((src) => (
                  <div
                    key={src.slice(0, 80)}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-black"
                  >
                    <ProductMedia src={src} thumb className="h-full w-full" />
                    {isVideoSrc(src) ? (
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white">
                        Video
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        removeImage(src)
                        if (form.video === src) {
                          setForm((f) => {
                            const next = { ...f }
                            delete next.video
                            return next
                          })
                        }
                      }}
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white opacity-90 hover:bg-red-500/80"
                      aria-label="Remove media"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              {form.video && !form.images.includes(form.video) ? (
                <p className="text-[11px] text-amber-200/80">
                  Video attached — save/publish to add it into the gallery.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-[12px] text-[#6a655c]">
              No media yet — pick from the library or upload an image/video.
              Uploaded videos publish to the main product gallery.
            </p>
          )}

          <label className="mt-3 block text-[11px] text-[#b8b0a4]">
            Or paste image URL
            <div className="mt-1 flex gap-2">
              <input
                value={imageUrlDraft}
                onChange={(e) => setImageUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  const url = imageUrlDraft.trim()
                  if (!url) return
                  addImages([url])
                  setImageUrlDraft('')
                }}
                placeholder="/assets/… or https://…"
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const url = imageUrlDraft.trim()
                  if (!url) return
                  addImages([url])
                  setImageUrlDraft('')
                }}
                className="shrink-0 rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-wider text-[#b8b0a4]"
              >
                Add
              </button>
            </div>
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Variants · color & size</h3>
            <p className="text-[11px] text-[#6a655c]">
              Sizes for {form.shopCategory.replace(/-/g, ' ')}
            </p>
          </div>

          <p className="mb-2 text-[11px] uppercase tracking-wider text-[#6a655c]">
            Colours
          </p>
          <div className="mb-4 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c.name}
                type="button"
                title={`${c.name} (${c.hex})`}
                onClick={() => {
                  setCustomColourOpen(false)
                  setVariantDraft((d) => ({
                    ...d,
                    color: c.name,
                    hex: c.hex,
                  }))
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px]',
                  !customColourActive && variantDraft.color === c.name
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                    : 'border-white/15 text-[#b8b0a4] hover:border-white/30',
                )}
              >
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/25"
                  style={{ background: c.hex }}
                />
                {c.name}
              </button>
            ))}
            <button
              type="button"
              title="Add a custom colour"
              onClick={() => {
                setCustomColourOpen(true)
                setVariantDraft((d) => ({
                  ...d,
                  color: isPresetColour ? '' : d.color,
                  hex: isPresetColour ? '#2563eb' : d.hex,
                }))
                requestAnimationFrame(() => {
                  customColourNameRef.current?.focus()
                })
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
                customColourActive
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                  : 'border-dashed border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10',
              )}
            >
              <span
                className="grid h-3.5 w-3.5 place-items-center rounded-full border border-current text-[9px] leading-none"
                aria-hidden
              >
                +
              </span>
              Custom
            </button>
          </div>

          {customColourActive ? (
            <div className="mb-3 rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/5 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                Custom colour
              </p>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
                <label className="text-[11px] text-[#b8b0a4]">
                  Colour name
                  <input
                    ref={customColourNameRef}
                    value={variantDraft.color}
                    onChange={(e) => {
                      setCustomColourOpen(true)
                      setVariantDraft((d) => ({
                        ...d,
                        color: e.target.value,
                      }))
                    }}
                    placeholder="e.g. Royal Blue"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-[11px] text-[#b8b0a4]">
                  Pick
                  <input
                    type="color"
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(variantDraft.hex)
                        ? variantDraft.hex
                        : '#2563eb'
                    }
                    onChange={(e) => {
                      setCustomColourOpen(true)
                      setVariantDraft((d) => ({ ...d, hex: e.target.value }))
                    }}
                    className="mt-1 h-9 w-14 cursor-pointer rounded-lg border border-white/10 bg-black p-0.5"
                    aria-label="Pick custom colour"
                  />
                </label>
                <label className="text-[11px] text-[#b8b0a4]">
                  Hex
                  <input
                    value={variantDraft.hex}
                    onChange={(e) => {
                      setCustomColourOpen(true)
                      setVariantDraft((d) => ({
                        ...d,
                        hex: e.target.value,
                      }))
                    }}
                    placeholder="#2563eb"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black px-2 py-1.5 text-sm font-mono"
                  />
                </label>
              </div>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-3">
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

        {formError ? (
          <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
            {formError}
          </p>
        ) : null}

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(false)}
            className="rounded-full border border-white/20 py-3 text-[12px] font-semibold uppercase tracking-wider text-[#e8e6e1] disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(true)}
            className="rounded-full bg-[#D4AF37] py-3 text-[12px] font-semibold uppercase tracking-wider text-black disabled:opacity-50"
          >
            {busy ? 'Publishing…' : 'Submit · Publish'}
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-[#6a655c]">
          Save keeps editing · Submit publishes to the shop
        </p>
      </div>

      <MediaPickerModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onConfirm={addFromLibrary}
        maxSelect={Math.max(
          1,
          MAX_PRODUCT_IMAGES - form.images.length,
        )}
        title="Add media from library"
      />
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
    getProduct,
  } = useProducts()
  const { toast } = useToast()
  const router = useRouter()
  const params = useSearchParams()
  const statusFilter = params.get('status')
  const [editor, setEditor] = useState<{
    mode: EditorMode
    product: Product
  } | null>(null)

  const visibleProducts = useMemo(() => {
    if (statusFilter === 'saved' || statusFilter === 'draft') {
      return products.filter(isDraftProduct)
    }
    if (statusFilter === 'published') {
      return products.filter(isPublishedProduct)
    }
    return products
  }, [products, statusFilter])

  useEffect(() => {
    if (params.get('new') === '1') {
      setEditor({ mode: 'create', product: emptyProduct() })
      router.replace(
        statusFilter === 'saved' || statusFilter === 'draft'
          ? '/dashboard/products?status=saved'
          : '/dashboard/products',
      )
      return
    }
    const editId = params.get('edit')
    if (editId) {
      const product = getProduct(editId)
      if (product) {
        setEditor({ mode: 'edit', product: { ...product } })
      }
      router.replace(
        statusFilter === 'saved' || statusFilter === 'draft'
          ? '/dashboard/products?status=saved'
          : '/dashboard/products',
      )
    }
  }, [params, router, getProduct, statusFilter])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="serif text-3xl">
            {statusFilter === 'saved' || statusFilter === 'draft'
              ? 'Saved products'
              : 'Products'}
          </h1>
          <p className="mt-1 text-sm text-[#b8b0a4]">
            {statusFilter === 'saved' || statusFilter === 'draft'
              ? 'Drafts saved in admin — not live on the shop until you Submit · Publish.'
              : 'Manual catalog edits sync to shop & homepage.'}
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

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All', products.length],
            [
              'published',
              'Published',
              products.filter(isPublishedProduct).length,
            ],
            ['saved', 'Saved', products.filter(isDraftProduct).length],
          ] as const
        ).map(([id, label, count]) => {
          const active =
            id === 'all'
              ? !statusFilter || statusFilter === 'all'
              : statusFilter === id ||
                (id === 'saved' && statusFilter === 'draft')
          return (
            <Link
              key={id}
              href={
                id === 'all'
                  ? '/dashboard/products'
                  : `/dashboard/products?status=${id}`
              }
              className={cn(
                'rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider',
                active
                  ? 'border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#D4AF37]'
                  : 'border-white/10 text-[#8a8a8a] hover:border-white/20',
              )}
            >
              {label} · {count}
            </Link>
          )
        })}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-zinc-950 text-[11px] uppercase tracking-[0.16em] text-[#b8b0a4]">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Variants</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-[#6a655c]"
                >
                  {statusFilter === 'saved' || statusFilter === 'draft'
                    ? 'No saved drafts yet — use Save on a product to keep it here.'
                    : 'No products in this list.'}
                </td>
              </tr>
            ) : null}
            {visibleProducts.map((p) => (
              <tr key={p.id} className="border-t border-white/10">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-lg ring-1 ring-white/10">
                      <ProductMedia
                        src={
                          (p.images ?? []).find((src) => !isVideoSrc(src)) ||
                          (p.images ?? [])[0] ||
                          '/assets/fringe-hero.png'
                        }
                        alt=""
                        thumb
                        className="h-full w-full"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-[12px] text-[#b8b0a4]">{p.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                      isDraftProduct(p)
                        ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                        : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
                    )}
                  >
                    {isDraftProduct(p) ? 'Saved' : 'Published'}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize text-[#b8b0a4]">
                  {(p.shopCategory ?? 'women').replace(/-/g, ' ')}
                </td>
                <td className="px-4 py-3 text-[#D4AF37]">${p.price}</td>
                <td className="px-4 py-3">{(p.variants ?? []).length}</td>
                <td className="px-4 py-3">
                  {(p.variants ?? []).reduce((s, v) => s + (v.stock || 0), 0)}
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
          key={editor.product.id || 'new-product'}
          mode={editor.mode}
          initial={editor.product}
          onClose={() => setEditor(null)}
          onSave={(product, opts) => {
            const exists = products.some(
              (p) => p.id === product.id || p.slug === product.slug,
            )
            const ok = exists
              ? updateProduct(product.id, product)
              : addProduct(product)

            if (!ok) return false

            if (opts.publish) {
              toast('Product published to shop')
              setEditor(null)
              window.setTimeout(() => {
                router.push(`/shop/${product.id}`)
              }, 250)
            } else {
              toast('Product saved — find it under Saved products')
              setEditor({ mode: 'edit', product })
            }
            return true
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
