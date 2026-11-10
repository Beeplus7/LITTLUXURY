import { NextResponse } from 'next/server'
import {
  emptyShopState,
  productHasUploads,
  readShopState,
  writeShopState,
  type ShopSyncState,
} from '@/lib/shopStateServer'
import { normalizeEmail, type StaffMember } from '@/lib/shopStaff'
import type { Product } from '@/data/products'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function actorEmail(req: Request): string | null {
  const header = req.headers.get('x-shop-actor')
  if (!header) return null
  return normalizeEmail(header)
}

function canWrite(state: ShopSyncState, email: string | null): boolean {
  if (!email) return false
  // First-time claim: no owner yet
  if (!state.staff.ownerEmail) return true
  const member = state.staff.staff.find(
    (s) => s.email === email && s.active !== false,
  )
  return Boolean(member)
}

export async function GET() {
  try {
    const state = await readShopState()
    return NextResponse.json(state)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Read failed' },
      { status: 500 },
    )
  }
}

export async function PUT(req: Request) {
  try {
    const email = actorEmail(req)
    const body = (await req.json()) as Partial<ShopSyncState> & {
      claimOwner?: StaffMember
    }
    const current = await readShopState()

    if (!canWrite(current, email)) {
      return NextResponse.json(
        { error: 'Not authorized for this shop' },
        { status: 403 },
      )
    }

    let staff = current.staff

    // Claim shop as sole owner (only when unset)
    if (body.claimOwner && !current.staff.ownerEmail) {
      const ownerEmail = normalizeEmail(body.claimOwner.email)
      staff = {
        ownerEmail,
        staff: [
          {
            ...body.claimOwner,
            email: ownerEmail,
            role: 'owner',
            active: true,
            createdAt: body.claimOwner.createdAt || new Date().toISOString(),
          },
        ],
        updatedAt: new Date().toISOString(),
      }
    } else if (body.staff) {
      // Only owner may rewrite staff list
      const isOwner =
        email &&
        (current.staff.ownerEmail === email ||
          current.staff.staff.some(
            (s) => s.email === email && s.role === 'owner',
          ))
      if (!isOwner && current.staff.ownerEmail) {
        return NextResponse.json(
          { error: 'Only the shop owner can manage team users' },
          { status: 403 },
        )
      }
      staff = {
        ownerEmail: body.staff.ownerEmail
          ? normalizeEmail(body.staff.ownerEmail)
          : current.staff.ownerEmail,
        staff: Array.isArray(body.staff.staff) ? body.staff.staff : current.staff.staff,
        updatedAt: new Date().toISOString(),
      }
    }

    const allowClear =
      (body as { allowClearCatalog?: boolean }).allowClearCatalog === true

    let products = current.products
    const removedIds = Array.isArray(body.removedIds)
      ? body.removedIds
      : current.removedIds

    if (Array.isArray(body.products)) {
      // Block accidental full wipe of a live catalog
      if (
        body.products.length === 0 &&
        current.products.length > 0 &&
        !allowClear
      ) {
        return NextResponse.json(
          {
            error:
              'Refused empty catalog sync — uploaded products are protected. Delete items one-by-one in admin.',
          },
          { status: 409 },
        )
      }

      const incoming = body.products as Product[]
      const incomingIds = new Set(
        incoming.map((p) => p.id).filter(Boolean) as string[],
      )
      const removed = new Set(removedIds)
      // Keep any uploaded products missing from this sync (unless explicitly removed)
      const protectedKeep = (current.products as Product[]).filter((p) => {
        if (!p?.id) return false
        if (incomingIds.has(p.id)) return false
        if (removed.has(p.id) || (p.slug && removed.has(p.slug))) return false
        return productHasUploads(p)
      })
      products = [...incoming, ...protectedKeep]
    }

    // Never drop upload-backed media library entries unless explicitly hidden
    let userMedia = Array.isArray(body.userMedia)
      ? body.userMedia
      : current.userMedia
    if (Array.isArray(body.userMedia) && current.userMedia.length) {
      const incomingMediaIds = new Set(
        body.userMedia.map((m) => m.id).filter(Boolean),
      )
      const hidden = new Set(
        Array.isArray(body.hiddenMediaIds)
          ? body.hiddenMediaIds
          : current.hiddenMediaIds,
      )
      const keepMedia = current.userMedia.filter((m) => {
        if (incomingMediaIds.has(m.id)) return false
        if (hidden.has(m.id)) return false
        const src = (m as { src?: string }).src || ''
        return src.includes('/assets/uploads/')
      })
      userMedia = [...body.userMedia, ...keepMedia]
    }

    const next: ShopSyncState = {
      staff,
      products,
      removedIds,
      userMedia,
      hiddenMediaIds: Array.isArray(body.hiddenMediaIds)
        ? body.hiddenMediaIds
        : current.hiddenMediaIds,
      updatedAt: new Date().toISOString(),
    }

    // Never allow clearing owner once set except via explicit staff rewrite by owner
    if (current.staff.ownerEmail && !next.staff.ownerEmail) {
      next.staff.ownerEmail = current.staff.ownerEmail
    }

    await writeShopState(next)
    return NextResponse.json(next)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Write failed' },
      { status: 500 },
    )
  }
}

export async function POST() {
  // Ensure file exists
  const state = await readShopState()
  if (!state.updatedAt) await writeShopState(emptyShopState())
  return NextResponse.json(await readShopState())
}
