'use client'

import { SettingsTabs } from '@/components/SettingsTabs'
import { useProducts } from '@/context/ProductsContext'
import { useToast } from '@/lib/toast'

export default function DashboardSettingsPage() {
  const { products } = useProducts()
  const { toast } = useToast()

  function exportProduction() {
    const payload = {
      exportedAt: new Date().toISOString(),
      brand: 'LITTLUXRY',
      products,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'littluxry-products.json'
    a.click()
    URL.revokeObjectURL(url)

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>LITTLUXRY Export</title></head><body><h1>LITTLUXRY Production Export</h1><pre>${JSON.stringify(products, null, 2)}</pre></body></html>`
    const htmlBlob = new Blob([html], { type: 'text/html' })
    const htmlUrl = URL.createObjectURL(htmlBlob)
    const a2 = document.createElement('a')
    a2.href = htmlUrl
    a2.download = 'littluxry-export.html'
    a2.click()
    URL.revokeObjectURL(htmlUrl)
    toast('Exported products.json + HTML')
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="serif text-3xl">Settings</h1>
          <p className="text-sm text-[#b8b0a4]">
            Profile, security, store, payments, billing
          </p>
        </div>
        <button
          type="button"
          onClick={exportProduction}
          className="rounded-full bg-[#D4AF37] px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-black"
        >
          Export production build
        </button>
      </div>
      <SettingsTabs />
    </div>
  )
}
