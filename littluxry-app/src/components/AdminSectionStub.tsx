'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export function AdminSectionStub({
  title,
  blurb,
  children,
}: {
  title: string
  blurb: string
  children?: ReactNode
}) {
  return (
    <div>
      <h1 className="serif text-[28px] tracking-tight lg:text-[32px]">
        {title}
      </h1>
      <p className="mt-1 max-w-xl text-[13px] text-[#8a8a8a]">{blurb}</p>
      <div className="mt-6 rounded-[16px] border border-[#1a1a1a] bg-[#111] p-6">
        {children ?? (
          <p className="text-[13px] text-[#8a8a8a]">
            Section shell from your Shop Admin foundation — wire live data next.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/ai"
            className="rounded-full bg-[#D4AF37] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-black"
          >
            Open AI Builder
          </Link>
          <Link
            href="/dashboard/products"
            className="rounded-full border border-[#2a2a2a] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#c9c9c9]"
          >
            Products
          </Link>
        </div>
      </div>
    </div>
  )
}
