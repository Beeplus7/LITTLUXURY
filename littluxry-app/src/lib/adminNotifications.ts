import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'

export type AdminNotification = {
  id: string
  type: 'payment' | 'cart_recovery' | 'system'
  title: string
  body: string
  href?: string
  createdAt: string
  read: boolean
  meta?: Record<string, string | number | undefined>
}

function dataDir() {
  return path.join(process.cwd(), 'data')
}

function pathFile() {
  return path.join(dataDir(), 'admin-notifications.json')
}

async function readAll(): Promise<AdminNotification[]> {
  try {
    const raw = await readFile(pathFile(), 'utf8')
    const parsed = JSON.parse(raw) as {
      notifications?: AdminNotification[]
    }
    return Array.isArray(parsed.notifications) ? parsed.notifications : []
  } catch {
    return []
  }
}

async function writeAll(notifications: AdminNotification[]) {
  await mkdir(dataDir(), { recursive: true })
  await writeFile(
    pathFile(),
    JSON.stringify(
      { updatedAt: new Date().toISOString(), notifications },
      null,
      2,
    ),
    'utf8',
  )
}

export async function listAdminNotifications(): Promise<AdminNotification[]> {
  const list = await readAll()
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function unreadAdminNotificationCount(): Promise<number> {
  return (await readAll()).filter((n) => !n.read).length
}

export async function pushAdminNotification(
  input: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>,
): Promise<AdminNotification> {
  const list = await readAll()
  const note: AdminNotification = {
    ...input,
    id: `ntf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    read: false,
  }
  await writeAll([note, ...list].slice(0, 200))
  return note
}

export async function markAdminNotificationsRead(
  ids?: string[],
): Promise<number> {
  const list = await readAll()
  let changed = 0
  const next = list.map((n) => {
    if (n.read) return n
    if (ids && ids.length && !ids.includes(n.id)) return n
    changed += 1
    return { ...n, read: true }
  })
  if (changed) await writeAll(next)
  return changed
}
