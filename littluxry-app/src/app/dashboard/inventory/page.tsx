'use client'

import { AdminSectionStub } from '@/components/AdminSectionStub'
import { useProducts } from '@/context/ProductsContext'

export default function InventoryPage() {
  const { products } = useProducts()
  const rows = products.flatMap((p) =>
    p.variants.map((v) => ({
      product: p.menuLabel,
      color: v.color,
      sku: v.sku,
      stock: v.stock,
    })),
  )

  return (
    <AdminSectionStub
      title="Inventory"
      blurb="Stock levels across Fringe Muse variants and imported SKUs."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-[#6a6a6a]">
            <tr>
              <th className="pb-3">Product</th>
              <th className="pb-3">Variant</th>
              <th className="pb-3">SKU</th>
              <th className="pb-3">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {rows.slice(0, 24).map((r) => (
              <tr key={`${r.sku}-${r.color}`}>
                <td className="py-2.5 text-[#e8e6e1]">{r.product}</td>
                <td className="py-2.5 text-[#9a9a9a]">{r.color}</td>
                <td className="py-2.5 text-[#9a9a9a]">{r.sku}</td>
                <td
                  className={
                    r.stock < 5
                      ? 'py-2.5 font-semibold text-amber-400'
                      : 'py-2.5 text-[#e8e6e1]'
                  }
                >
                  {r.stock}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminSectionStub>
  )
}
