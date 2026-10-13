export type Review = {
  id: number
  name: string
  date: string
  rating: number
  color: string
  title: string
  text: string
}

const NAMES = ['Ava M.', 'Sofia L.', 'Mila R.', 'Zara K.', 'Lena P.', 'Noor A.', 'Chloe T.', 'Isla J.']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May']
const COLORS = ['Black', 'White', 'Beige', 'Pink', 'Green']
const TITLES = [
  'Obsessed. The fringe moves like water',
  'Perfect size — fits everything',
  'Heirloom quality',
  'My most complimented bag',
  'Better in person',
  'The leather is butter',
]
const TEXTS = [
  "I was worried about the fringe tangling but it doesn't. It has weight and swing. The leather smell alone is worth it. Carried it to dinner and three people stopped me.",
  'XS is misleading — fits iPhone Pro Max, cardholder, lipstick, keys easily. The magnetic closure is strong, not cheap. Gold hardware is not too yellow.',
  "Litt nailed the proportion. I'm 5'2 and it doesn't overwhelm. The black goes with literally everything. Already ordered the Oat for summer.",
  "Saw it on IG and thought it was filtered. It's actually better. The pebble is soft but holds shape. Packaging felt like a private atelier.",
  'Bought for a wedding and now use daily. The pink is not bubblegum, more dusty rose. Super elevated.',
  'Emerald is stunning in low light. Got the noir as gift for mom. Packaging is chic — no plastic nonsense.',
]

/** 50 reviews generated from foundation product page patterns */
export const reviewsData: Review[] = Array.from({ length: 50 }, (_, n) => ({
  id: n + 1,
  name: NAMES[n % 8],
  date: `${MONTHS[n % 5]} ${12 + (n % 16)}, 2025`,
  rating: n % 7 === 0 ? 4 : 5,
  color: COLORS[n % 5],
  title: TITLES[n % 6],
  text: TEXTS[n % 6],
}))
