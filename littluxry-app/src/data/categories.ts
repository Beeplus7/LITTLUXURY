export type ShopCategoryId =
  | 'women-bags'
  | 'women-dress'
  | 'women'
  | 'shoes'
  | 'sneakers'
  | 'jacket'
  | 'accessories'
  | 'men'
  | 'men-sweatshirt'
  | 'men-tshirts'
  | 'men-sneakers'
  | 'men-shoes'
  | 'men-accessories'

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
  {
    id: 'men',
    slug: 'men',
    label: 'Men',
    description: 'Ready-to-wear essentials for him.',
  },
  {
    id: 'men-sweatshirt',
    slug: 'men-sweatshirt',
    label: 'Men Sweatshirt',
    description: 'Premium fleece and atelier sweatshirts.',
  },
  {
    id: 'men-tshirts',
    slug: 'men-tshirts',
    label: 'Men T-Shirts',
    description: 'Refined tees with clean lines.',
  },
  {
    id: 'men-sneakers',
    slug: 'men-sneakers',
    label: 'Men Sneakers',
    description: 'Luxury trainers for everyday pace.',
  },
  {
    id: 'men-shoes',
    slug: 'men-shoes',
    label: 'Men Shoes',
    description: 'Leather footwear and formal pairs.',
  },
  {
    id: 'men-accessories',
    slug: 'men-accessories',
    label: 'Men Accessories',
    description: 'Belts, wallets, and finishing pieces.',
  },
]

export function getCategoryBySlug(slug: string | null | undefined) {
  if (!slug || slug === 'all') return null
  return SHOP_CATEGORIES.find((c) => c.slug === slug) ?? null
}

export function isShopCategoryId(value: string): value is ShopCategoryId {
  return SHOP_CATEGORIES.some((c) => c.id === value)
}
