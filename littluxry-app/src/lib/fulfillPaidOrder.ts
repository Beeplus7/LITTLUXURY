import { pushAdminNotification } from '@/lib/adminNotifications'
import {
  sendAdminPaymentEmail,
  sendOrderConfirmationEmail,
  type OrderEmailPayload,
} from '@/lib/orderEmail'
import { upsertPaidOrder } from '@/lib/ordersStore'
import { readShopState } from '@/lib/shopStateServer'

async function resolveAdminEmails(): Promise<string[]> {
  const fromEnv = process.env.ORDER_EMAIL_NOTIFY?.trim()
  const emails = new Set<string>()
  if (fromEnv) emails.add(fromEnv.toLowerCase())
  try {
    const state = await readShopState()
    if (state.staff.ownerEmail) emails.add(state.staff.ownerEmail)
    for (const member of state.staff.staff) {
      if (member.active !== false && member.email) {
        emails.add(member.email.toLowerCase())
      }
    }
  } catch {
    /* ignore */
  }
  return Array.from(emails)
}

/** Persist order, notify admin portal, email customer + admin. */
export async function fulfillPaidOrder(payload: OrderEmailPayload) {
  const { order, created } = await upsertPaidOrder(payload)

  if (created) {
    await pushAdminNotification({
      type: 'payment',
      title: `Payment · $${payload.total.toFixed(2)}`,
      body: `${payload.customerName || 'Customer'} · ${payload.to}`,
      href: '/dashboard/orders',
      meta: {
        orderId: order.id,
        total: payload.total,
        email: payload.to,
      },
    })
  }

  const customerMail = await sendOrderConfirmationEmail(payload)
  const adminEmails = await resolveAdminEmails()
  const adminMail = await sendAdminPaymentEmail(payload, adminEmails)

  return {
    order,
    created,
    customerMail,
    adminMail,
    adminEmails,
  }
}
