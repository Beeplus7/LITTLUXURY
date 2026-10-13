'use client'

import { useRef, useState } from 'react'
import {
  Sparkles,
  Send,
  Link2,
  ImagePlus,
  Film,
  Loader2,
  Trash2,
  PackagePlus,
  Library,
  X,
} from 'lucide-react'
import { useProducts } from '@/context/ProductsContext'
import { useToast } from '@/lib/toast'
import type { ProductVariant } from '@/data/products'
import {
  productFromExtract,
  type ExtractedProduct,
  type ExtractedVariant,
} from '@/lib/extractProduct'
import { readImageAsDataUrl, readVideoAsDataUrl } from '@/lib/readImageFile'
import { MediaPickerModal } from '@/components/MediaPickerModal'
import type { MediaItem } from '@/data/media'
import { cn } from '@/lib/cn'

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

type Draft = {
  title: string
  description: string
  price: number
  sourceUrl?: string
  images: string[]
  video?: string | null
  brand?: string | null
  variants: ExtractedVariant[]
  analysisNote?: string
}

function emptyDraft(): Draft {
  return {
    title: '',
    description: '',
    price: 198,
    images: [],
    video: null,
    variants: [],
  }
}

export function AIBuilder({ productId }: { productId?: string }) {
  const { products, addVariant, getProduct, addProduct, updateProduct } =
    useProducts()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const [input, setInput] = useState('')
  const [link, setLink] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'AI Shop Builder ready. Paste a product URL, pick images from Media Library, upload photos/video, or ask for a color variant.',
    },
  ])

  function push(role: Msg['role'], text: string) {
    setMessages((m) => [...m, { role, text }])
  }

  function handlePrompt(raw: string) {
    const prompt = raw.trim()
    if (!prompt) return
    push('user', prompt)
    setInput('')

    if (/^https?:\/\//i.test(prompt)) {
      setLink(prompt)
      void extractFromUrl(prompt)
      return
    }

    const lower = prompt.toLowerCase()
    if (/\b(import|publish|add)\b.*\b(variant|all)\b/.test(lower) && draft) {
      publishDraft()
      return
    }

    const colorKey = Object.keys(COLOR_MAP).find((k) => lower.includes(k))
    const targetId =
      productId ??
      products.find((p) => p.category === 'fringe')?.id ??
      products[0]?.id

    if (!targetId || !colorKey) {
      push(
        'assistant',
        'Paste a product URL to analyze images & variants, upload images, or mention a color like beige / emerald.',
      )
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
      image: draft?.images[0] ?? product.images[0],
    }

    addVariant(product.id, variant)
    push(
      'assistant',
      `Created ${colorName} variant for ${product.menuLabel} — $${variant.price}, SKU ${variant.sku}.`,
    )
    toast(`${colorName} variant added`)
  }

  async function extractFromUrl(urlOverride?: string) {
    const url = (urlOverride ?? link).trim()
    if (!url) {
      toast('Paste a product URL first')
      return
    }
    setExtracting(true)
    push('user', `Analyze ${url}`)
    try {
      const res = await fetch('/api/extract-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        product?: ExtractedProduct
        analysis?: ExtractedProduct['analysis']
        error?: string
      }
      if (!res.ok || !data.product) {
        throw new Error(data.error || 'Analyze failed')
      }
      const p = data.product
      const variants = (p.variants ?? []).map((v) => ({
        ...v,
        selected: v.selected !== false,
      }))
      const images = [
        ...p.images,
        ...(p.image ? [p.image] : []),
      ].filter((v, i, a) => a.indexOf(v) === i)

      setDraft({
        title: p.title,
        description: p.description,
        price: p.price && p.price > 0 ? Math.round(p.price) : 198,
        sourceUrl: p.url,
        brand: p.brand,
        images,
        variants,
        analysisNote: `${p.analysis?.imageCount ?? images.length} images · ${
          p.analysis?.variantCount ?? variants.length
        } variants · via ${(p.analysis?.sources ?? []).join(', ') || 'page'}`,
      })

      push(
        'assistant',
        `Analyzed “${p.title}”: ${images.length} image(s), ${variants.length} variant(s)${
          p.price ? ` · from $${Math.round(p.price)}` : ''
        }. Toggle variants below, then Publish to import.`,
      )
      toast('Link analyzed')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Analyze failed'
      push('assistant', `Couldn’t analyze that link: ${msg}`)
      toast(msg)
    } finally {
      setExtracting(false)
    }
  }

  async function onUploadFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      const loaded: string[] = []
      for (const file of Array.from(files).slice(0, 6)) {
        loaded.push(await readImageAsDataUrl(file))
      }
      setDraft((prev) => {
        const base = prev ?? emptyDraft()
        return {
          ...base,
          title: base.title || fileTitle(files[0]!),
          images: [...base.images, ...loaded].slice(0, 16),
        }
      })
      push(
        'assistant',
        `Uploaded ${loaded.length} image${loaded.length === 1 ? '' : 's'}. Publish or paste a URL to pull variants too.`,
      )
      toast(`${loaded.length} image${loaded.length === 1 ? '' : 's'} added`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      toast(msg)
      push('assistant', msg)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onUploadVideo(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploadingVideo(true)
    try {
      const dataUrl = await readVideoAsDataUrl(file)
      setDraft((prev) => {
        const base = prev ?? emptyDraft()
        return {
          ...base,
          title: base.title || fileTitle(file),
          video: dataUrl,
        }
      })
      push(
        'assistant',
        `Video “${file.name}” attached (${(file.size / (1024 * 1024)).toFixed(1)}MB). It will save on the product when you Import.`,
      )
      toast('Video uploaded')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Video upload failed'
      toast(msg)
      push('assistant', msg)
    } finally {
      setUploadingVideo(false)
      if (videoRef.current) videoRef.current.value = ''
    }
  }

  function addFromLibrary(items: MediaItem[]) {
    if (!items.length) return
    const images = items.filter((m) => m.type === 'image').map((m) => m.src)
    const video = items.find((m) => m.type === 'video')?.src
    const labelHint = items[0]?.label ?? 'Library pick'

    setDraft((prev) => {
      const base = prev ?? emptyDraft()
      return {
        ...base,
        title: base.title || labelHint.replace(/[-_]+/g, ' ').trim(),
        images: [...base.images, ...images]
          .filter((v, i, a) => a.indexOf(v) === i)
          .slice(0, 16),
        video: video ?? base.video,
      }
    })
    setLibraryOpen(false)
    const parts = [
      images.length
        ? `${images.length} image${images.length === 1 ? '' : 's'}`
        : null,
      video ? '1 video' : null,
    ].filter(Boolean)
    push(
      'assistant',
      `Added ${parts.join(' + ')} from Media Library. Edit the draft, then Import.`,
    )
    toast(`Added ${parts.join(' + ')} from library`)
  }

  function removeDraftImage(index: number) {
    setDraft((d) => {
      if (!d) return d
      return { ...d, images: d.images.filter((_, i) => i !== index) }
    })
  }

  function toggleVariant(id: string) {
    setDraft((d) => {
      if (!d) return d
      return {
        ...d,
        variants: d.variants.map((v) =>
          v.id === id ? { ...v, selected: !v.selected } : v,
        ),
      }
    })
  }

  function selectAllVariants(on: boolean) {
    setDraft((d) =>
      d
        ? { ...d, variants: d.variants.map((v) => ({ ...v, selected: on })) }
        : d,
    )
  }

  function publishDraft() {
    if (!draft) return
    if (!draft.title.trim()) {
      toast('Add a product title')
      return
    }
    if (!draft.images.length && !draft.video) {
      toast('Add at least one image or video')
      return
    }

    const selectedIds = draft.variants
      .filter((v) => v.selected !== false)
      .map((v) => v.id)

    const extracted: ExtractedProduct = {
      url: draft.sourceUrl || 'https://litt-luxury.com',
      title: draft.title.trim(),
      description: draft.description.trim(),
      image: draft.images[0] ?? null,
      images: draft.images,
      price: draft.price,
      currency: 'USD',
      brand: draft.brand ?? null,
      variants: draft.variants,
      analysis: {
        imageCount: draft.images.length,
        variantCount: draft.variants.length,
        sources: ['ai-builder'],
      },
    }
    const product = productFromExtract(extracted, {
      localImages: draft.images.length
        ? draft.images
        : ['/assets/fringe-hero.png'],
      selectedVariantIds: selectedIds.length ? selectedIds : undefined,
      video: draft.video,
    })
    addProduct(product)
    push(
      'assistant',
      `Imported “${product.name}” with ${product.images.length} image(s), ${product.variants.length} variant(s)${
        product.video ? ', and a product video' : ''
      }. Live in Shop & Products.`,
    )
    toast(
      product.video
        ? `Imported ${product.variants.length} variants + video`
        : `Imported ${product.variants.length} variants`,
    )
    setDraft(null)
    setLink('')
  }

  function attachImagesToSelected() {
    if (!draft?.images.length && !draft?.video) {
      toast('Upload images or a video first')
      return
    }
    const targetId =
      productId ??
      products.find((p) => p.category === 'fringe')?.id ??
      products[0]?.id
    if (!targetId) return
    const product = getProduct(targetId)
    if (!product) return
    const images = [...(draft.images ?? []), ...product.images].filter(
      (v, i, a) => a.indexOf(v) === i,
    )
    if (draft.video && !images.includes(draft.video)) images.push(draft.video)
    const selectedVars = (draft.variants ?? []).filter(
      (v) => v.selected !== false,
    )
    for (const v of selectedVars) {
      addVariant(targetId, {
        id: `${targetId}-${v.id}`,
        color: [v.color, v.size].filter(Boolean).join(' / ') || v.name,
        hex: v.hex,
        price: v.price && v.price > 0 ? Math.round(v.price) : product.price,
        stock: 8,
        sku: v.sku || `LL-IMP-${v.id.slice(0, 8).toUpperCase()}`,
        image: v.image || draft.images[0],
      })
    }
    updateProduct(targetId, {
      images,
      ...(draft.video ? { video: draft.video } : {}),
    })
    push(
      'assistant',
      `Attached ${draft.images.length} image(s)${
        draft.video ? ' + video' : ''
      }${
        selectedVars.length ? ` + ${selectedVars.length} variant(s)` : ''
      } to ${product.menuLabel}.`,
    )
    toast('Attached to product')
  }

  const selectedCount =
    draft?.variants.filter((v) => v.selected !== false).length ?? 0

  return (
    <div className="flex h-full min-h-[560px] flex-col rounded-2xl border border-white/10 bg-zinc-950">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <Sparkles size={16} className="text-[#D4AF37]" />
        <h3 className="text-sm font-semibold">AI Shop Builder</h3>
      </div>

      <div className="space-y-3 border-b border-white/10 p-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b8b0a4]"
            />
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste product URL to analyze images & variants"
              className="w-full rounded-full border border-white/10 bg-black py-2 pl-9 pr-3 text-sm outline-none focus:border-[#D4AF37]/50"
            />
          </div>
          <button
            type="button"
            disabled={extracting}
            onClick={() => void extractFromUrl()}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#D4AF37] disabled:opacity-50"
          >
            {extracting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <PackagePlus size={14} />
            )}
            Analyze
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void onUploadFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ImagePlus size={14} />
            )}
            Upload images
          </button>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/40 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#D4AF37]"
          >
            <Library size={14} />
            Media library
          </button>
          <input
            ref={videoRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
            className="hidden"
            onChange={(e) => void onUploadVideo(e.target.files)}
          />
          <button
            type="button"
            disabled={uploadingVideo}
            onClick={() => videoRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider disabled:opacity-50"
          >
            {uploadingVideo ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Film size={14} />
            )}
            Upload video
          </button>
          {draft?.images.length || draft?.video ? (
            <button
              type="button"
              onClick={attachImagesToSelected}
              className="rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-wider text-[#b8b0a4]"
            >
              Attach to current product
            </button>
          ) : null}
        </div>
      </div>

      {draft ? (
        <div className="max-h-[340px] space-y-3 overflow-y-auto border-b border-white/10 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#D4AF37]">
                Import draft
              </p>
              {draft.analysisNote ? (
                <p className="mt-0.5 text-[11px] text-[#6a655c]">
                  {draft.analysisNote}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="text-[#b8b0a4] hover:text-white"
              aria-label="Clear draft"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {draft.images.slice(0, 12).map((src, i) => (
              <div key={`${src}-${i}`} className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover ring-1 ring-white/10"
                />
                <button
                  type="button"
                  onClick={() => removeDraftImage(i)}
                  className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-black/80 text-white ring-1 ring-white/20"
                  aria-label="Remove image"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
            {draft.video ? (
              <video
                src={draft.video}
                muted
                playsInline
                className="h-14 w-20 shrink-0 rounded-lg object-cover ring-1 ring-[#D4AF37]/50"
              />
            ) : null}
            {!draft.images.length && !draft.video ? (
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="grid h-14 w-14 place-items-center rounded-lg bg-zinc-900 text-[10px] text-[#b8b0a4] ring-1 ring-dashed ring-white/15 hover:text-[#D4AF37]"
              >
                Pick
              </button>
            ) : null}
          </div>

          {draft.video ? (
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
              <video
                src={draft.video}
                controls
                playsInline
                className="max-h-40 w-full object-contain"
              />
              <button
                type="button"
                onClick={() =>
                  setDraft((d) => (d ? { ...d, video: null } : d))
                }
                className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] uppercase tracking-wider text-white"
              >
                Remove video
              </button>
            </div>
          ) : null}

          <div className="grid gap-2">
            <input
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => (d ? { ...d, title: e.target.value } : d))
              }
              placeholder="Product title"
              className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
            <textarea
              value={draft.description}
              onChange={(e) =>
                setDraft((d) =>
                  d ? { ...d, description: e.target.value } : d,
                )
              }
              rows={2}
              placeholder="Description"
              className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-[12px] text-[#b8b0a4]">
              Base $
              <input
                type="number"
                value={draft.price}
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, price: Number(e.target.value) || 0 } : d,
                  )
                }
                className="w-24 rounded-lg border border-white/10 bg-black px-2 py-1.5 text-sm text-white"
              />
            </label>
          </div>

          {draft.variants.length ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#b8b0a4]">
                  Variants ({selectedCount}/{draft.variants.length})
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectAllVariants(true)}
                    className="text-[10px] uppercase tracking-wider text-[#D4AF37]"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => selectAllVariants(false)}
                    className="text-[10px] uppercase tracking-wider text-[#6a655c]"
                  >
                    None
                  </button>
                </div>
              </div>
              <ul className="grid max-h-36 gap-1.5 overflow-y-auto">
                {draft.variants.map((v) => (
                  <li key={v.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-2 py-1.5 text-[12px] hover:border-[#D4AF37]/30">
                      <input
                        type="checkbox"
                        checked={v.selected !== false}
                        onChange={() => toggleVariant(v.id)}
                        className="accent-[#D4AF37]"
                      />
                      {v.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.image}
                          alt=""
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        <span
                          className="h-8 w-8 rounded ring-1 ring-white/20"
                          style={{ background: v.hex }}
                        />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[#f5f0e8]">
                        {[v.color, v.size].filter(Boolean).join(' · ') || v.name}
                      </span>
                      <span className="text-[#D4AF37]">
                        {v.price ? `$${Math.round(v.price)}` : '—'}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[12px] text-[#6a655c]">
              No variants found on page — a default variant will be created on
              publish.
            </p>
          )}

          <button
            type="button"
            onClick={publishDraft}
            className="w-full rounded-full bg-[#D4AF37] py-2.5 text-[11px] font-semibold uppercase tracking-wider text-black"
          >
            Import {selectedCount || 1} variant
            {(selectedCount || 1) === 1 ? '' : 's'} · {draft.images.length}{' '}
            image
            {draft.images.length === 1 ? '' : 's'}
            {draft.video ? ' · video' : ''}
          </button>
          {draft.sourceUrl ? (
            <p className="truncate text-[11px] text-[#6a655c]">
              Source: {draft.sourceUrl}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'rounded-2xl px-3 py-2',
              m.role === 'user'
                ? 'ml-8 bg-[#D4AF37]/15 text-[#f5f0e8]'
                : 'mr-8 bg-zinc-900 text-[#b8b0a4]',
            )}
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
          placeholder='Product URL, or “Add emerald green variant”'
          className="flex-1 rounded-full border border-white/10 bg-black px-4 py-2 text-sm outline-none focus:border-[#D4AF37]/50"
        />
        <button
          type="submit"
          className="grid h-10 w-10 place-items-center rounded-full bg-[#D4AF37] text-black transition hover:brightness-110"
        >
          <Send size={16} />
        </button>
      </form>

      <MediaPickerModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onConfirm={addFromLibrary}
        maxSelect={16}
      />
    </div>
  )
}

function fileTitle(file: File) {
  return file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
}
