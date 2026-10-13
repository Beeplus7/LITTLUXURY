import type { Product } from '@/data/products'
import type { SupportMessageType } from '@/context/SupportMessagesContext'

export type ChatMsg = { role: 'user' | 'assistant'; text: string }

export type PendingRequest = {
  type: SupportMessageType
  name?: string
  email?: string
  phone?: string
  details?: string
  productHint?: string
  orderHint?: string
}

export type StorefrontAction =
  | { type: 'noop' }
  | { type: 'recommend'; query: string }
  | { type: 'start_request'; requestType: SupportMessageType; seed?: string }
  | { type: 'set_field'; field: keyof PendingRequest; value: string }
  | { type: 'submit_request' }
  | { type: 'cancel_request' }
  | { type: 'link'; href: string; label: string }

export type StorefrontTurn = {
  reply: string
  actions: StorefrontAction[]
  suggestions: string[]
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
const PHONE_RE = /(?:\+?\d[\d\s().-]{7,}\d)/

function typeLabel(type: SupportMessageType) {
  if (type === 'product_request') return 'product request'
  if (type === 'order_request') return 'order request'
  if (type === 'support') return 'support message'
  return 'message'
}

function nextMissing(pending: PendingRequest): keyof PendingRequest | null {
  if (!pending.name?.trim()) return 'name'
  if (!pending.email?.trim()) return 'email'
  if (!pending.details?.trim()) return 'details'
  return null
}

function promptFor(field: keyof PendingRequest, type: SupportMessageType): string {
  if (field === 'name') return 'What’s your name?'
  if (field === 'email') return 'What’s the best email for our team to reply to?'
  if (field === 'details') {
    if (type === 'product_request') {
      return 'What product are you looking for? Include color, size, or budget if you can.'
    }
    if (type === 'order_request') {
      return 'Share your order ID (if you have one) and what you need help with.'
    }
    return 'Tell me how we can help — our admin/support team will see this.'
  }
  return 'Anything else to add?'
}

export function matchProducts(products: Product[], query: string, limit = 4): Product[] {
  const q = query.toLowerCase().trim()
  if (!q) return products.slice(0, limit)
  const scored = products
    .map((p) => {
      const hay = [
        p.name,
        p.menuLabel,
        p.description,
        p.category,
        p.shopCategory,
        ...(p.features || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      let score = 0
      for (const token of q.split(/\s+/)) {
        if (hay.includes(token)) score += 1
      }
      if (hay.includes(q)) score += 2
      return { p, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return (scored.length ? scored.map((x) => x.p) : products.slice(0, limit)).slice(
    0,
    limit,
  )
}

export function formatProductRecs(products: Product[]): string {
  if (!products.length) return 'I couldn’t find a match — try another style or ask to leave a product request.'
  return (
    'Here are a few picks:\n' +
    products
      .map(
        (p, i) =>
          `${i + 1}. ${p.menuLabel || p.name} — $${p.price} · /shop/${p.slug || p.id}`,
      )
      .join('\n') +
    '\n\nWant me to open the shop, or leave a product request for our team?'
  )
}

export function suggestionsFor(pending: PendingRequest | null): string[] {
  if (pending) {
    const miss = nextMissing(pending)
    if (miss === 'name') return ['Ava Morgan', 'Cancel request']
    if (miss === 'email') return ['hello@example.com', 'Cancel request']
    if (miss === 'details') {
      if (pending.type === 'order_request') {
        return ['Order LL-1042 shipping update', 'Cancel request']
      }
      if (pending.type === 'product_request') {
        return ['Looking for a black fringe bag', 'Cancel request']
      }
      return ['Need help with sizing', 'Cancel request']
    }
    return ['Send to support', 'Cancel request']
  }
  return [
    'Show me bags',
    'I want a product',
    'Order help',
    'Talk to support',
    'What can you do?',
  ]
}

export function interpretStorefrontMessage(
  raw: string,
  pending: PendingRequest | null,
): StorefrontTurn {
  const text = raw.trim()
  const lower = text.toLowerCase()

  if (pending) {
    if (/\b(cancel|never ?mind|stop|abort)\b/.test(lower)) {
      return {
        reply: 'Okay — request cancelled. I can still help with products or a new message anytime.',
        actions: [{ type: 'cancel_request' }],
        suggestions: suggestionsFor(null),
      }
    }

    const miss = nextMissing(pending)
    if (miss === 'name') {
      const name = text.replace(/^(i('|’)m|my name is|this is)\s+/i, '').trim()
      const next: PendingRequest = { ...pending, name }
      const following = nextMissing(next)
      return {
        reply: `Thanks, ${name.split(' ')[0]}. ${following ? promptFor(following, pending.type) : 'Ready to send?'}`,
        actions: [{ type: 'set_field', field: 'name', value: name }],
        suggestions: suggestionsFor(next),
      }
    }
    if (miss === 'email') {
      const email = text.match(EMAIL_RE)?.[0]
      if (!email) {
        return {
          reply: 'Please share a valid email so admin/support can reply.',
          actions: [],
          suggestions: suggestionsFor(pending),
        }
      }
      const next: PendingRequest = { ...pending, email }
      const following = nextMissing(next)
      return {
        reply: following
          ? `Got it. ${promptFor(following, pending.type)}`
          : 'All set — say “send” and I’ll deliver this to our team.',
        actions: [{ type: 'set_field', field: 'email', value: email }],
        suggestions: suggestionsFor(next),
      }
    }
    if (miss === 'details') {
      const phone = text.match(PHONE_RE)?.[0]
      const details = text.trim()
      const actions: StorefrontAction[] = [
        { type: 'set_field', field: 'details', value: details },
      ]
      if (phone) actions.push({ type: 'set_field', field: 'phone', value: phone })
      if (pending.type === 'product_request') {
        actions.push({ type: 'set_field', field: 'productHint', value: details })
      }
      if (pending.type === 'order_request') {
        const orderId = text.match(/\b(?:LL-)?\d{3,}\b/i)?.[0]
        if (orderId) {
          actions.push({
            type: 'set_field',
            field: 'orderHint',
            value: orderId.toUpperCase().startsWith('LL')
              ? orderId.toUpperCase()
              : `LL-${orderId}`,
          })
        } else {
          actions.push({ type: 'set_field', field: 'orderHint', value: details })
        }
      }
      return {
        reply: `Perfect. I’ll send this ${typeLabel(pending.type)} to admin/support. Reply “send” to confirm, or “cancel” to discard.`,
        actions,
        suggestions: ['Send to support', 'Cancel request'],
      }
    }

    if (/\b(send|submit|confirm|yes|deliver)\b/.test(lower)) {
      return {
        reply: `Sending your ${typeLabel(pending.type)} to our admin & support inbox now.`,
        actions: [{ type: 'submit_request' }],
        suggestions: suggestionsFor(null),
      }
    }

    return {
      reply: 'Say “send” to deliver this to support, or “cancel” to start over.',
      actions: [],
      suggestions: ['Send to support', 'Cancel request'],
    }
  }

  if (/^(hi|hello|hey|yo)\b/.test(lower) || /\bhow are you\b/.test(lower)) {
    return {
      reply:
        'Welcome to LITTLUXRY. I can recommend products, take a product request, help with an order, or pass a message to admin/support.',
      actions: [],
      suggestions: suggestionsFor(null),
    }
  }

  if (/\b(help|what can you do|how (do|does))\b/.test(lower)) {
    return {
      reply:
        'Try:\n• “Show me bags / sneakers / fringe”\n• “I want a product” (product request)\n• “Order help” or “Where is my order”\n• “Talk to support”\nI’ll collect your details and deliver the message to our admin inbox.',
      actions: [],
      suggestions: suggestionsFor(null),
    }
  }

  if (
    /\b(order|shipping|tracking|delivery|refund|return)\b/.test(lower) ||
    /\bwhere is my (order|package)\b/.test(lower)
  ) {
    return {
      reply:
        'I can open an order request for admin/support. I’ll need your name, email, and order details.',
      actions: [
        {
          type: 'start_request',
          requestType: 'order_request',
          seed: text,
        },
      ],
      suggestions: ['Ava Morgan', 'Cancel request'],
    }
  }

  if (
    /\b(product request|request (a |this )?product|looking for|want (a |the )?product|special order|custom)\b/.test(
      lower,
    ) ||
    /\bi want\b/.test(lower)
  ) {
    return {
      reply:
        'Happy to take a product request. Our team will see it in the admin inbox. What’s your name?',
      actions: [
        { type: 'start_request', requestType: 'product_request', seed: text },
      ],
      suggestions: ['Ava Morgan', 'Cancel request'],
    }
  }

  if (
    /\b(support|human|agent|admin|contact|message|speak to|talk to)\b/.test(
      lower,
    )
  ) {
    return {
      reply:
        'I’ll connect you with admin/support. What’s your name so they can follow up?',
      actions: [{ type: 'start_request', requestType: 'support', seed: text }],
      suggestions: ['Ava Morgan', 'Cancel request'],
    }
  }

  if (
    /\b(show|find|recommend|suggest|browse|shop|looking)\b/.test(lower) ||
    /\b(bags?|shoes?|sneakers?|fringe|rosso|riviera|dress|jacket)\b/.test(lower)
  ) {
    return {
      reply: 'Searching the collection for you…',
      actions: [{ type: 'recommend', query: text }],
      suggestions: [
        'I want a product',
        'Talk to support',
        'Show me sneakers',
        'Order help',
      ],
    }
  }

  return {
    reply:
      'I can recommend pieces, take a product request, help with an order, or message support. What do you need?',
    actions: [],
    suggestions: suggestionsFor(null),
  }
}

export function buildMessagePayload(pending: PendingRequest) {
  const subject =
    pending.type === 'product_request'
      ? `Product request: ${pending.productHint || pending.details || 'New inquiry'}`
      : pending.type === 'order_request'
        ? `Order request: ${pending.orderHint || pending.details || 'Order help'}`
        : pending.type === 'support'
          ? `Support: ${pending.details?.slice(0, 60) || 'Customer message'}`
          : `Message: ${pending.details?.slice(0, 60) || 'Customer message'}`

  return {
    type: pending.type,
    name: pending.name?.trim() || 'Guest',
    email: pending.email?.trim() || '',
    phone: pending.phone?.trim(),
    subject: subject.slice(0, 120),
    body: pending.details?.trim() || '',
    productHint: pending.productHint,
    orderHint: pending.orderHint,
  }
}
