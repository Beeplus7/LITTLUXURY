import type { ExtractedVariant } from '@/lib/extractProduct'

export type BuilderDraft = {
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

export type BuilderAction =
  | { type: 'analyze_url'; url: string }
  | { type: 'open_library'; hint?: string }
  | { type: 'upload_images' }
  | { type: 'upload_video' }
  | { type: 'set_title'; title: string }
  | { type: 'set_price'; price: number }
  | { type: 'set_description'; description: string }
  | { type: 'generate_copy' }
  | { type: 'import' }
  | { type: 'clear_draft' }
  | { type: 'add_color_variant'; colorKey: string }
  | { type: 'select_variants'; mode: 'all' | 'none' }
  | { type: 'attach' }
  | { type: 'noop' }

export type BuilderTurn = {
  reply: string
  actions: BuilderAction[]
  suggestions: string[]
}

export const COLOR_MAP: Record<string, string> = {
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
  navy: '#0a1628',
  brown: '#5c4033',
  gold: '#d4af37',
  silver: '#c0c0c0',
}

function draftSummary(draft: BuilderDraft | null): string {
  if (!draft) return 'No draft yet.'
  const selected = draft.variants.filter((v) => v.selected !== false).length
  const bits = [
    draft.title ? `“${draft.title}”` : 'untitled',
    `$${draft.price}`,
    `${draft.images.length} image${draft.images.length === 1 ? '' : 's'}`,
  ]
  if (draft.video) bits.push('video')
  if (draft.variants.length) bits.push(`${selected}/${draft.variants.length} variants`)
  return bits.join(' · ')
}

export function suggestionsFor(draft: BuilderDraft | null): string[] {
  if (!draft) {
    return [
      'Pick bags from library',
      'Open media library',
      'Help me build a product',
      'What can you do?',
    ]
  }
  const out: string[] = []
  if (!draft.title.trim()) out.push('Call it Riviera Fringe Bag')
  if (!draft.description.trim()) out.push('Write a product description')
  if (draft.images.length < 2) out.push('Add more images from library')
  if (draft.variants.length) out.push('Select all variants')
  out.push('Set price to 248', 'Import to shop', 'Show draft status')
  return out.slice(0, 5)
}

export function generateProductCopy(draft: BuilderDraft): {
  title: string
  description: string
} {
  const brand = draft.brand?.trim()
  const fromSrc = draft.sourceUrl
    ? (() => {
        try {
          return new URL(draft.sourceUrl).hostname.replace(/^www\./, '')
        } catch {
          return null
        }
      })()
    : null

  const categoryHint = /sneaker|jordan|shoe|trainer/i.test(
    `${draft.title} ${draft.description}`,
  )
    ? 'sneakers'
    : /bag|purse|wallet|handbag/i.test(`${draft.title} ${draft.description}`)
      ? 'bag'
      : 'piece'

  const title =
    draft.title.trim() ||
    (brand
      ? `${brand} ${categoryHint === 'sneakers' ? 'Sneaker' : categoryHint === 'bag' ? 'Bag' : 'Edit'}`
      : categoryHint === 'sneakers'
        ? 'Studio Sneaker'
        : categoryHint === 'bag'
          ? 'Signature Leather Bag'
          : 'LITT LUXURY Studio Piece')

  const description =
    draft.description.trim() ||
    [
      `A ${categoryHint} selected for the LITT LUXURY shop`,
      brand ? `inspired by ${brand}` : null,
      draft.images.length
        ? `with ${draft.images.length} studio/reference image${draft.images.length === 1 ? '' : 's'}`
        : null,
      fromSrc ? `sourced via ${fromSrc}` : null,
      'Ready to publish with clean variants and media.',
    ]
      .filter(Boolean)
      .join(' ') + '.'

  return { title, description }
}

function extractQuoted(text: string): string | null {
  const m =
    text.match(/[“"]([^”"]+)[”"]/) ||
    text.match(/\bas\s+(.+)$/i) ||
    text.match(/:\s*(.+)$/)
  return m?.[1]?.trim() || null
}

export function interpretBuilderMessage(
  raw: string,
  draft: BuilderDraft | null,
): BuilderTurn {
  const text = raw.trim()
  const lower = text.toLowerCase()
  const suggestions = suggestionsFor(draft)

  // URL anywhere in message
  const urlMatch = text.match(/https?:\/\/[^\s]+/i)
  if (urlMatch) {
    return {
      reply: `Got it — I’ll analyze ${urlMatch[0]} for images, price, and variants.`,
      actions: [{ type: 'analyze_url', url: urlMatch[0].replace(/[.,)]+$/, '') }],
      suggestions: ['Import to shop', 'Write a product description', 'Show draft status'],
    }
  }

  if (/^(hi|hello|hey|yo)\b/.test(lower) || /\bhow are you\b/.test(lower)) {
    return {
      reply:
        'Hey — I’m your shop builder. Tell me what you want to list: pick media, paste a product link, set a price, or say “import” when the draft looks right.',
      actions: [],
      suggestions,
    }
  }

  if (
    /\b(help|what can you do|how (do|does) (this|it) work|commands?)\b/.test(
      lower,
    )
  ) {
    return {
      reply:
        'Try things like:\n• “Pick bags from library”\n• “Analyze https://…”\n• “Call it Noir Fringe”\n• “Set price to 248”\n• “Write a description”\n• “Add emerald variant”\n• “Import to shop”\n• “What’s in the draft?”',
      actions: [],
      suggestions,
    }
  }

  if (
    /\b(status|what('|’)s in|show (me )?(the )?draft|current draft)\b/.test(
      lower,
    )
  ) {
    return {
      reply: draft
        ? `Here’s where we are: ${draftSummary(draft)}. Want to tweak the title, price, media, or import?`
        : 'No draft yet. Start with media library, an upload, or a product URL.',
      actions: [],
      suggestions,
    }
  }

  if (
    /\b(open|pick|choose|browse|from)\b.*\b(library|media|yupoo)\b/.test(lower) ||
    (/\b(library|media)\b/.test(lower) &&
      /\b(open|pick|show|use)\b/.test(lower)) ||
    /\bpick\b.*\b(bags?|shoes?|sneakers?)\b/.test(lower) ||
    /\b(bags?|shoes?|sneakers?)\b.*\b(library|media|photos?|images?)\b/.test(
      lower,
    )
  ) {
    const hint = /\bbags?\b/.test(lower)
      ? 'bags'
      : /\bsneakers?\b/.test(lower)
        ? 'sneakers'
        : /\bshoes?\b/.test(lower)
          ? 'shoes'
          : undefined
    return {
      reply: hint
        ? `Opening the Media Library filtered toward ${hint}. Select what you want in the draft.`
        : 'Opening the Media Library — pick images (or a video) and I’ll add them to the draft.',
      actions: [{ type: 'open_library', hint }],
      suggestions: draft
        ? ['Write a product description', 'Set price to 248', 'Import to shop']
        : ['Pick bags from library', 'Help me build a product'],
    }
  }

  if (/\b(upload)\b.*\b(image|photo|picture)s?\b/.test(lower)) {
    return {
      reply: 'Sure — use the upload picker and drop in up to 6 photos.',
      actions: [{ type: 'upload_images' }],
      suggestions,
    }
  }

  if (/\b(upload)\b.*\bvideo\b/.test(lower)) {
    return {
      reply: 'Open the video picker and choose an MP4/WebM for the product.',
      actions: [{ type: 'upload_video' }],
      suggestions,
    }
  }

  if (
    /\b(clear|reset|start over|discard)\b/.test(lower) &&
    /\b(draft|this|product)?\b/.test(lower)
  ) {
    return {
      reply: draft
        ? 'Cleared the draft. What should we build next?'
        : 'Nothing to clear — draft is already empty.',
      actions: draft ? [{ type: 'clear_draft' }] : [],
      suggestions: suggestionsFor(null),
    }
  }

  if (
    /\b(import|publish|go live|add to (shop|catalog)|save (it|product))\b/.test(
      lower,
    )
  ) {
    if (!draft) {
      return {
        reply:
          'There’s nothing to import yet. Pick images from the library or paste a product URL first.',
        actions: [{ type: 'open_library' }],
        suggestions: suggestionsFor(null),
      }
    }
    return {
      reply: `Publishing ${draftSummary(draft)} to the shop now.`,
      actions: [{ type: 'import' }],
      suggestions: ['Help me build a product', 'Pick bags from library'],
    }
  }

  if (/\b(attach)\b/.test(lower) && draft) {
    return {
      reply: 'Attaching this draft’s media (and selected variants) to the current product.',
      actions: [{ type: 'attach' }],
      suggestions,
    }
  }

  if (/\b(select|choose) all\b/.test(lower) && draft?.variants.length) {
    return {
      reply: 'Selected every variant in the draft.',
      actions: [{ type: 'select_variants', mode: 'all' }],
      suggestions,
    }
  }

  if (/\b(select|choose) none\b|\bdeselect all\b/.test(lower) && draft?.variants.length) {
    return {
      reply: 'Cleared variant selection.',
      actions: [{ type: 'select_variants', mode: 'none' }],
      suggestions,
    }
  }

  // Title
  const titleMatch =
    lower.match(
      /^(?:call it|name it|title(?:\s+it)?(?:\s+to)?|set title(?:\s+to)?|rename(?:\s+it)?(?:\s+to)?)\s+(.+)$/i,
    ) || text.match(/^(?:call it|name it|title)\s*[:=]\s*(.+)$/i)
  if (titleMatch?.[1]) {
    const title = titleMatch[1].replace(/^["“]|["”]$/g, '').trim()
    return {
      reply: `Title set to “${title}”. Want a description or a price next?`,
      actions: [{ type: 'set_title', title }],
      suggestions: [
        'Write a product description',
        'Set price to 248',
        'Import to shop',
      ],
    }
  }

  // Price
  const priceMatch =
    lower.match(
      /(?:price|cost|charge|sell(?:ing)?(?:\s+for)?|set(?:\s+it)?(?:\s+to)?)\s*(?:to\s*|at\s*|=\s*)?\$?\s*(\d{2,5}(?:\.\d{1,2})?)/i,
    ) || lower.match(/^\$\s*(\d{2,5}(?:\.\d{1,2})?)$/)
  if (priceMatch?.[1]) {
    const price = Math.round(Number(priceMatch[1]))
    return {
      reply: `Base price is now $${price}. Say “import” when you’re ready to publish.`,
      actions: [{ type: 'set_price', price }],
      suggestions: draft
        ? ['Write a product description', 'Import to shop', 'Show draft status']
        : ['Pick bags from library', 'Open media library'],
    }
  }

  // Description
  if (
    /\b(describe|description|write (a |the )?description|product copy|rewrite (the )?copy)\b/.test(
      lower,
    )
  ) {
    const quoted = extractQuoted(text)
    if (quoted && quoted.length > 8 && !/write a product description/i.test(quoted)) {
      return {
        reply: 'Description updated. Anything else — price, variants, or import?',
        actions: [{ type: 'set_description', description: quoted }],
        suggestions: ['Set price to 248', 'Import to shop', 'Show draft status'],
      }
    }
    if (!draft) {
      return {
        reply:
          'Add media or a product link first, then I can draft a title and description for you.',
        actions: [{ type: 'open_library' }],
        suggestions: suggestionsFor(null),
      }
    }
    return {
      reply: 'I’ll draft clean product copy from what’s in the draft.',
      actions: [{ type: 'generate_copy' }],
      suggestions: ['Set price to 248', 'Import to shop', 'Show draft status'],
    }
  }

  // Color variant
  const colorKey = Object.keys(COLOR_MAP).find((k) =>
    new RegExp(`\\b${k}\\b`, 'i').test(lower),
  )
  if (
    colorKey &&
    /\b(variant|color|colour|add|create|make)\b/.test(lower)
  ) {
    return {
      reply: `Adding a ${colorKey} color variant to the current product.`,
      actions: [{ type: 'add_color_variant', colorKey }],
      suggestions: ['Show draft status', 'Import to shop'],
    }
  }

  if (/\b(build|create|make|start)\b.*\b(product|listing|item)\b/.test(lower)) {
    return {
      reply:
        'Let’s build one. I’d start with media — bags, shoes, or sneakers from the library — then we can name it, price it, and import.',
      actions: [{ type: 'open_library' }],
      suggestions: [
        'Pick bags from library',
        'Pick sneakers from library',
        'Open media library',
      ],
    }
  }

  // Soft fallback — stay conversational with draft awareness
  if (draft) {
    return {
      reply: `I heard “${text}”. Draft is ${draftSummary(draft)}. You can change the title (“call it …”), set a price, open the library, or say “import”.`,
      actions: [],
      suggestions,
    }
  }

  return {
    reply: `I can help with that. Try “pick bags from library”, paste a product URL, or ask “what can you do?”`,
    actions: [],
    suggestions,
  }
}
