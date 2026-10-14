import { NextResponse } from 'next/server'
import {
  emptyShopState,
  readShopState,
  writeShopState,
  type ShopSyncState,
} from '@/lib/shopStateServer'
import { normalizeEmail, type StaffMember } from '@/lib/shopStaff'

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

    const next: ShopSyncState = {
      staff,
      products: Array.isArray(body.products) ? body.products : current.products,
      removedIds: Array.isArray(body.removedIds)
        ? body.removedIds
        : current.removedIds,
      userMedia: Array.isArray(body.userMedia)
        ? body.userMedia
        : current.userMedia,
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
