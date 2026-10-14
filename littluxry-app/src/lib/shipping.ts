/** Destinations we ship to — Europe and USA only. */

export type ShipRegion = 'europe' | 'usa'

export const SHIP_REGIONS: {
  id: ShipRegion
  label: string
  short: string
}[] = [
  { id: 'europe', label: 'Europe', short: 'EU' },
  { id: 'usa', label: 'USA', short: 'USA' },
]

export const DEFAULT_SHIPPING_EUROPE = 18
export const DEFAULT_SHIPPING_USA = 22

export type ShippingRates = {
  shippingEurope?: number
  shippingUsa?: number
}

export function shippingCostForRegion(
  rates: ShippingRates | null | undefined,
  region: ShipRegion,
): number {
  if (region === 'europe') {
    return Number(rates?.shippingEurope ?? DEFAULT_SHIPPING_EUROPE) || 0
  }
  return Number(rates?.shippingUsa ?? DEFAULT_SHIPPING_USA) || 0
}

/** Order shipping: highest regional rate among cart lines (once per line). */
export function orderShippingTotal(
  lines: (ShippingRates & { quantity?: number })[],
  region: ShipRegion,
): number {
  if (!lines.length) return 0
  return lines.reduce(
    (max, line) => Math.max(max, shippingCostForRegion(line, region)),
    0,
  )
}

export function shipRegionLabel(region: ShipRegion): string {
  return SHIP_REGIONS.find((r) => r.id === region)?.label ?? region
}
