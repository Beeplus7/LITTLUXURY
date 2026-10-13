export type ShopCategoryId =
  | 'women-bags'
  | 'women-dress'
  | 'women'
  | 'shoes'
  | 'sneakers'
  | 'jacket'
  | 'accessories'

export type ShopCategory = {
  id: ShopCategoryId
  slug: ShopCategoryId
  label: string
  description: string
}

export const SHOP_CATEGORIES: ShopCategory[] = [
  {
    id: 'women-bags',
    slug: 'women-bags',
    label: 'Women Bags',
    description: 'Hobos, buckets, and totes — Fringe Muse & beyond.',
  },
  {
    id: 'women-dress',
    slug: 'women-dress',
    label: 'Women Dress',
    description: 'Evening and day dresses with atelier cut.',
  },
  {
    id: 'women',
    slug: 'women',
    label: 'Women',
    description: 'Ready-to-wear essentials for her.',
  },
  {
    id: 'shoes',
    slug: 'shoes',
    label: 'Shoes',
    description: 'Heels, flats, and leather footwear.',
  },
  {
    id: 'sneakers',
    slug: 'sneakers',
    label: 'Sneakers',
    description: 'Luxury trainers for city pace.',
  },
  {
    id: 'jacket',
    slug: 'jacket',
    label: 'Jacket',
    description: 'Outerwear with quiet status.',
  },
  {
    id: 'accessories',
    slug: 'accessories',
    label: 'Accessories',
    description: 'Belts, scarves, and finishing pieces.',
  },
]

export function getCategoryBySlug(slug: string | null | undefined) {
  if (!slug || slug === 'all') return null
  return SHOP_CATEGORIES.find((c) => c.slug === slug) ?? null
}

export function isShopCategoryId(value: string): value is ShopCategoryId {
  return SHOP_CATEGORIES.some((c) => c.id === value)
}
