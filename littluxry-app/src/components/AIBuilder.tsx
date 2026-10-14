'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useProducts } from '@/context/ProductsContext'
import { useToast } from '@/lib/toast'
import type { ProductVariant } from '@/data/products'
import {
  productFromExtract,
  type ExtractedProduct,
  type ExtractedVariant,
} from '@/lib/extractProduct'
import { saveLocalImage, saveLocalVideo } from '@/lib/localMediaStore'
import { MediaPickerModal } from '@/components/MediaPickerModal'
import type { MediaItem } from '@/data/media'
import {
  COLOR_MAP,
  generateProductCopy,
  interpretBuilderMessage,
  suggestionsFor,
  type BuilderAction,
  type BuilderDraft,
} from '@/lib/aiBuilderChat'
import { cn } from '@/lib/cn'

type Msg = { role: 'user' | 'assistant'; text: string }

type Draft = BuilderDraft

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
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [link, setLink] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftOpen, setDraftOpen] = useState(true)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>(
    suggestionsFor(null),
  )
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      text: 'Hi — I’m your LITT LUXURY shop builder. Talk to me like a teammate: “pick bags from library”, paste a product URL, “call it Noir Fringe”, “set price to 248”, or “import to shop”.',
    },
  ])

  const draftRef = useRef<Draft | null>(null)
  draftRef.current = draft

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, thinking])

  useEffect(() => {
    setSuggestions(suggestionsFor(draft))
  }, [draft])

  function push(role: Msg['role'], text: string) {
    setMessages((m) => [...m, { role, text }])
  }

  async function runActions(actions: BuilderAction[]) {
    for (const action of actions) {
      switch (action.type) {
        case 'analyze_url':
          setLink(action.url)
          await extractFromUrl(action.url, { silentUser: true })
          break
        case 'open_library':
          setLibraryOpen(true)
          break
        case 'upload_images':
          fileRef.current?.click()
          break
        case 'upload_video':
          videoRef.current?.click()
          break
        case 'set_title':
          setDraft((prev) => {
            const base = prev ?? emptyDraft()
            return { ...base, title: action.title }
          })
          setDraftOpen(true)
          break
        case 'set_price':
          setDraft((prev) => {
            const base = prev ?? emptyDraft()
            return { ...base, price: action.price }
          })
          setDraftOpen(true)
          break
        case 'set_description':
          setDraft((prev) => {
            const base = prev ?? emptyDraft()
            return { ...base, description: action.description }
          })
          setDraftOpen(true)
          break
        case 'generate_copy': {
          const current = draftRef.current
          if (!current) break
          const copy = generateProductCopy(current)
          setDraft({ ...current, ...copy })
          setDraftOpen(true)
          push(
            'assistant',
            `Updated copy:\nTitle: ${copy.title}\n${copy.description}`,
          )
          toast('Copy drafted')
          break
        }
        case 'import':
          publishDraft()
          break
        case 'clear_draft':
          setDraft(null)
          setLink('')
          break
        case 'add_color_variant':
          addColorVariant(action.colorKey)
          break
        case 'select_variants':
          selectAllVariants(action.mode === 'all')
          break
        case 'attach':
          attachImagesToSelected()
          break
        default:
          break
      }
    }
  }

  async function handlePrompt(raw: string) {
    const prompt = raw.trim()
    if (!prompt || thinking) return
    push('user', prompt)
    setInput('')
    setThinking(true)
    try {
      // Small delay so the chat feels responsive/alive
      await new Promise((r) => setTimeout(r, 280))
      const turn = interpretBuilderMessage(prompt, draftRef.current)
      if (turn.reply) push('assistant', turn.reply)
      if (turn.suggestions?.length) setSuggestions(turn.suggestions)
      await runActions(turn.actions)
    } finally {
      setThinking(false)
    }
  }

  function addColorVariant(colorKey: string) {
    const targetId =
      productId ??
      products.find((p) => p.category === 'fringe')?.id ??
      products[0]?.id
    if (!targetId) {
      push('assistant', 'No product is available to attach a variant to yet.')
      return
    }
    const product = getProduct(targetId)
    if (!product) return
    const colorName = colorKey.charAt(0).toUpperCase() + colorKey.slice(1)
    const hex = COLOR_MAP[colorKey] ?? '#888888'
    const variant: ProductVariant = {
      id: `${product.id}-${colorKey}-${Date.now()}`,
      color: colorName,
      hex,
      price: draftRef.current?.price || product.price,
      stock: 10,
      sku: `LL-AI-${colorKey.slice(0, 3).toUpperCase()}`,
      image: draftRef.current?.images[0] ?? product.images[0],
    }
    addVariant(product.id, variant)
    push(
      'assistant',
      `Created ${colorName} variant for ${product.menuLabel} — $${variant.price}, SKU ${variant.sku}.`,
    )
    toast(`${colorName} variant added`)
  }

  async function extractFromUrl(
    urlOverride?: string,
    opts?: { silentUser?: boolean },
  ) {
    const url = (urlOverride ?? link).trim()
    if (!url) {
      toast('Paste a product URL first')
      return
    }
    setExtracting(true)
    if (!opts?.silentUser) push('user', `Analyze ${url}`)
    try {
      const res = await fetch('/api/extract-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        product?: ExtractedProduct
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
      const images = [...p.images, ...(p.image ? [p.image] : [])].filter(
        (v, i, a) => a.indexOf(v) === i,
      )

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
      setDraftOpen(true)

      push(
        'assistant',
        `Analyzed “${p.title}”: ${images.length} image(s), ${variants.length} variant(s)${
          p.price ? ` · from $${Math.round(p.price)}` : ''
        }. You can tweak the title/price in chat, or say “import to shop”.`,
      )
      setSuggestions([
        'Write a product description',
        'Set price to 248',
        'Import to shop',
        'Show draft status',
      ])
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
      for (const file of Array.from(files).slice(0, 24)) {
        loaded.push(
          file.type.startsWith('video/')
            ? await saveLocalVideo(file)
            : await saveLocalImage(file),
        )
      }
      setDraft((prev) => {
        const base = prev ?? emptyDraft()
        return {
          ...base,
          title: base.title || fileTitle(files[0]!),
          images: [...base.images, ...loaded].slice(0, 24),
        }
      })
      setDraftOpen(true)
      push(
        'assistant',
        `Uploaded ${loaded.length} image${loaded.length === 1 ? '' : 's'}. Want me to write a title/description, set a price, or import?`,
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
      const ref = await saveLocalVideo(file)
      setDraft((prev) => {
        const base = prev ?? emptyDraft()
        return {
          ...base,
          title: base.title || fileTitle(file),
          video: ref,
          images: [...base.images, ref]
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 24),
        }
      })
      setDraftOpen(true)
      push(
        'assistant',
        `Video “${file.name}” attached (${(file.size / (1024 * 1024)).toFixed(1)}MB). Say “import” when you’re ready.`,
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
          .slice(0, 24),
        video: video ?? base.video,
      }
    })
    setLibraryOpen(false)
    setDraftOpen(true)
    const parts = [
      images.length
        ? `${images.length} image${images.length === 1 ? '' : 's'}`
        : null,
      video ? '1 video' : null,
    ].filter(Boolean)
    push(
      'assistant',
      `Added ${parts.join(' + ')} from Media Library. Try “call it …”, “set price to 248”, “write a description”, or “import to shop”.`,
    )
    setSuggestions([
      'Call it Signature Bag',
      'Write a product description',
      'Set price to 248',
      'Import to shop',
    ])
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
    const current = draftRef.current
    if (!current) return
    if (!current.title.trim()) {
      push('assistant', 'Give it a title first — try “call it Riviera Fringe”.')
      toast('Add a product title')
      return
    }
    if (!current.images.length && !current.video) {
      push('assistant', 'Add at least one image or video before importing.')
      toast('Add at least one image or video')
      return
    }

    const selectedIds = current.variants
      .filter((v) => v.selected !== false)
      .map((v) => v.id)

    const extracted: ExtractedProduct = {
      url: current.sourceUrl || 'https://litt-luxury.com',
      title: current.title.trim(),
      description: current.description.trim(),
      image: current.images[0] ?? null,
      images: current.images,
      price: current.price,
      currency: 'USD',
      brand: current.brand ?? null,
      variants: current.variants,
      analysis: {
        imageCount: current.images.length,
        variantCount: current.variants.length,
        sources: ['ai-builder'],
      },
    }
    const product = productFromExtract(extracted, {
      localImages: current.images.length
        ? current.images
        : ['/assets/fringe-hero.png'],
      selectedVariantIds: selectedIds.length ? selectedIds : undefined,
      video: current.video,
    })
    addProduct(product)
    push(
      'assistant',
      `Imported “${product.name}” with ${product.images.length} image(s), ${product.variants.length} variant(s)${
        product.video ? ', and a product video' : ''
      }. It’s live in Shop & Products. Want to build another?`,
    )
    toast(
      product.video
        ? `Imported ${product.variants.length} variants + video`
        : `Imported ${product.variants.length} variants`,
    )
    setDraft(null)
    setLink('')
    setSuggestions(suggestionsFor(null))
  }

  function attachImagesToSelected() {
    const current = draftRef.current
    if (!current?.images.length && !current?.video) {
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
    const images = [...(current.images ?? []), ...product.images].filter(
      (v, i, a) => a.indexOf(v) === i,
    )
    if (current.video && !images.includes(current.video)) {
      images.push(current.video)
    }
    const selectedVars = (current.variants ?? []).filter(
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
        image: v.image || current.images[0],
      })
    }
    updateProduct(targetId, {
      images,
      ...(current.video ? { video: current.video } : {}),
    })
    push(
      'assistant',
      `Attached ${current.images.length} image(s)${
        current.video ? ' + video' : ''
      }${
        selectedVars.length ? ` + ${selectedVars.length} variant(s)` : ''
      } to ${product.menuLabel}.`,
    )
    toast('Attached to product')
  }

  const selectedCount =
    draft?.variants.filter((v) => v.selected !== false).length ?? 0

  return (
    <div className="flex h-full min-h-[640px] flex-col rounded-2xl border border-white/10 bg-zinc-950">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#D4AF37]" />
          <div>
            <h3 className="text-sm font-semibold">AI Shop Builder</h3>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#6a655c]">
              Conversational
            </p>
          </div>
        </div>
        {draft ? (
          <button
            type="button"
            onClick={() => setDraftOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-[#b8b0a4]"
          >
            Draft
            {draftOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-3 py-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void onUploadFiles(e.target.files)}
        />
        <input
          ref={videoRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          className="hidden"
          onChange={(e) => void onUploadVideo(e.target.files)}
        />
        <ToolChip
          onClick={() => setLibraryOpen(true)}
          icon={<Library size={12} />}
          label="Library"
          accent
        />
        <ToolChip
          onClick={() => fileRef.current?.click()}
          icon={
            uploading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <ImagePlus size={12} />
            )
          }
          label="Upload"
        />
        <ToolChip
          onClick={() => videoRef.current?.click()}
          icon={
            uploadingVideo ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Film size={12} />
            )
          }
          label="Video"
        />
        <div className="ml-auto flex min-w-[180px] max-w-[260px] flex-1 gap-1">
          <div className="relative flex-1">
            <Link2
              size={12}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6a655c]"
            />
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Product URL"
              className="w-full rounded-full border border-white/10 bg-black py-1.5 pl-7 pr-2 text-[11px] outline-none focus:border-[#D4AF37]/50"
            />
          </div>
          <button
            type="button"
            disabled={extracting}
            onClick={() => void extractFromUrl()}
            className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#D4AF37] disabled:opacity-50"
          >
            {extracting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <PackagePlus size={12} />
            )}
            Go
          </button>
        </div>
      </div>

      {draft && draftOpen ? (
        <div className="max-h-[280px] space-y-3 overflow-y-auto border-b border-white/10 p-3">
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
              onClick={() => {
                setDraft(null)
                push('assistant', 'Draft cleared. What should we build next?')
                setSuggestions(suggestionsFor(null))
              }}
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
          </div>

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
              <ul className="grid max-h-28 gap-1.5 overflow-y-auto">
                {draft.variants.map((v: ExtractedVariant) => (
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
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

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
        </div>
      ) : null}

      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              'whitespace-pre-wrap rounded-2xl px-3 py-2',
              m.role === 'user'
                ? 'ml-8 bg-[#D4AF37]/15 text-[#f5f0e8]'
                : 'mr-8 bg-zinc-900 text-[#b8b0a4]',
            )}
          >
            {m.text}
          </div>
        ))}
        {thinking ? (
          <div className="mr-8 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-3 py-2 text-[#6a655c]">
            <Loader2 size={14} className="animate-spin text-[#D4AF37]" />
            Thinking…
          </div>
        ) : null}
        <div ref={chatEndRef} />
      </div>

      {suggestions.length ? (
        <div className="flex flex-wrap gap-1.5 border-t border-white/5 px-3 pt-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={thinking}
              onClick={() => void handlePrompt(s)}
              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-[#b8b0a4] transition hover:border-[#D4AF37]/40 hover:text-[#D4AF37] disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="flex gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void handlePrompt(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={thinking}
          placeholder='Try “pick bags from library” or “set price to 248”'
          className="flex-1 rounded-full border border-white/10 bg-black px-4 py-2 text-sm outline-none focus:border-[#D4AF37]/50 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={thinking || !input.trim()}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#D4AF37] text-black transition hover:brightness-110 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>

      <MediaPickerModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onConfirm={addFromLibrary}
        maxSelect={24}
      />
    </div>
  )
}

function ToolChip({
  onClick,
  icon,
  label,
  accent,
}: {
  onClick: () => void
  icon: ReactNode
  label: string
  accent?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
        accent
          ? 'border-[#D4AF37]/40 text-[#D4AF37]'
          : 'border-white/15 text-[#b8b0a4]',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function fileTitle(file: File) {
  return file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim()
}
