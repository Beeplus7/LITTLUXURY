import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-5 text-center">
      <div>
        <p className="serif text-6xl tracking-[0.2em] text-[#D4AF37]">LL</p>
        <h1 className="mt-4 text-3xl">Page not found</h1>
        <p className="mt-2 text-[#b8b0a4]">
          This path isn’t in the atelier map.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-[#D4AF37] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-black"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
