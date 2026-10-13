/** Shared domain stubs — expand when schema is defined. */

export type Product = {
  id: string
  name: string
  slug: string
  price_cents: number
  currency: string
  image_url?: string | null
  description?: string | null
}

export type CartItem = {
  product_id: string
  quantity: number
}
