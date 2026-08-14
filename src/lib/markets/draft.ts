import type { ListingDraft, ListingDraftOption } from './types.ts'
import type {
  MarketListingRow,
  MasterProductRow,
  ProductOptionRow,
} from '@/types/redesign.types'

// Merge a master product with a listing's overrides into the draft the
// adapter consumes. Inheritance rule: a NULL override means "use the
// master value" — pure and unit-tested, this is the single place the
// rule lives.

export function buildListingDraft(
  master: MasterProductRow,
  options: ProductOptionRow[],
  listing: Pick<
    MarketListingRow,
    | 'name_override'
    | 'price_override'
    | 'category_override'
    | 'detail_content_override'
    | 'options_override'
    | 'platform_fields'
  > | null
): ListingDraft {
  const draftOptions: ListingDraftOption[] = options
    .filter((option) => option.is_active)
    .sort((a, b) => a.position - b.position)
    .map((option) => ({
      displayName: option.display_name,
      sku: option.sku,
      priceDelta: option.price_delta,
      stockQuantity: option.stock_quantity,
    }))

  const extraImages = Array.isArray(master.extra_image_urls)
    ? (master.extra_image_urls as unknown[]).filter((url): url is string => typeof url === 'string')
    : []

  return {
    name: listing?.name_override ?? master.name,
    price: listing?.price_override ?? master.base_price,
    stockQuantity:
      draftOptions.length > 0
        ? draftOptions.reduce((sum, option) => sum + option.stockQuantity, 0)
        : master.stock_quantity,
    categoryId: listing?.category_override ?? null,
    detailContent: listing?.detail_content_override ?? master.detail_content,
    imageUrl: master.image_url,
    extraImageUrls: extraImages,
    brand: master.brand,
    options: draftOptions,
    platformFields:
      listing?.platform_fields && typeof listing.platform_fields === 'object'
        ? (listing.platform_fields as Record<string, unknown>)
        : {},
  }
}

/** Fields where the listing diverges from its master (for the edit UI). */
export function listOverriddenFields(
  listing: Pick<
    MarketListingRow,
    'name_override' | 'price_override' | 'category_override' | 'detail_content_override' | 'options_override'
  >
): string[] {
  const overridden: string[] = []
  if (listing.name_override !== null) overridden.push('name')
  if (listing.price_override !== null) overridden.push('price')
  if (listing.category_override !== null) overridden.push('category')
  if (listing.detail_content_override !== null) overridden.push('detailContent')
  if (listing.options_override !== null) overridden.push('options')
  return overridden
}
