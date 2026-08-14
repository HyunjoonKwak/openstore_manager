'use server'

import { revalidatePath } from 'next/cache'
import { createRedesignClient } from '@/lib/supabase/redesign-server'
import { requireUser } from '@/lib/actions/auth-guard'
import { resolveMarketAccount } from '@/lib/markets/resolve'
import { buildListingDraft } from '@/lib/markets/draft'
import { validateInput } from '@/lib/validation'
import { upsertListingSchema } from '@/lib/validation-redesign'
import type { ValidationIssue } from '@/lib/markets/types'
import type {
  ListingSnapshotRow,
  MarketListingRow,
  MasterProductRow,
  ProductOptionRow,
} from '@/types/redesign.types'

// ------------------------------------------------------------------
// Readiness (준비 안 됨 badge)
// ------------------------------------------------------------------

export interface ListingReadiness {
  masterProductId: string
  marketAccountId: string
  issues: ValidationIssue[]
}

/**
 * Validate N products against one market account without any API call.
 * Powers the badge column on the product list.
 */
export async function getListingReadiness(
  marketAccountId: string,
  masterProductIds: string[]
): Promise<{ data: ListingReadiness[] | null; error: string | null }> {
  if (masterProductIds.length === 0) return { data: [], error: null }
  if (masterProductIds.length > 500) {
    return { data: null, error: '한 번에 500개까지만 검증할 수 있습니다.' }
  }

  const { resolved, error } = await resolveMarketAccount(marketAccountId)
  if (!resolved) return { data: null, error }

  const supabase = await createRedesignClient()
  const [{ data: products }, { data: options }, { data: listings }] = await Promise.all([
    supabase.from('master_products').select('*').in('id', masterProductIds),
    supabase.from('product_options').select('*').in('master_product_id', masterProductIds),
    supabase
      .from('market_listings')
      .select('*')
      .eq('market_account_id', marketAccountId)
      .in('master_product_id', masterProductIds),
  ])

  const optionsByProduct = new Map<string, ProductOptionRow[]>()
  for (const option of (options || []) as ProductOptionRow[]) {
    const list = optionsByProduct.get(option.master_product_id) || []
    optionsByProduct.set(option.master_product_id, [...list, option])
  }
  const listingByProduct = new Map<string, MarketListingRow>(
    ((listings || []) as MarketListingRow[]).map((listing) => [listing.master_product_id, listing])
  )

  const data = ((products || []) as MasterProductRow[]).map((product) => {
    const draft = buildListingDraft(
      product,
      optionsByProduct.get(product.id) || [],
      listingByProduct.get(product.id) || null
    )
    return {
      masterProductId: product.id,
      marketAccountId,
      issues: resolved.adapter.validateListing(draft),
    }
  })

  return { data, error: null }
}

// ------------------------------------------------------------------
// Overrides
// ------------------------------------------------------------------

export async function upsertListing(input: {
  masterProductId: string
  marketAccountId: string
  nameOverride?: string | null
  priceOverride?: number | null
  categoryOverride?: string | null
  detailContentOverride?: string | null
  platformFields?: Record<string, unknown>
}): Promise<{ data: { listingId: string } | null; error: string | null }> {
  const supabase = await createRedesignClient()
  try {
    await requireUser(supabase)
  } catch {
    return { data: null, error: '로그인이 필요합니다.' }
  }

  const validation = validateInput(upsertListingSchema, input)
  if (validation.error !== null) return { data: null, error: validation.error }
  const parsed = validation.data

  const { data: existing } = await supabase
    .from('market_listings')
    .select('id, platform_fields')
    .eq('master_product_id', parsed.masterProductId)
    .eq('market_account_id', parsed.marketAccountId)
    .maybeSingle()

  const patch: Record<string, unknown> = {}
  if (parsed.nameOverride !== undefined) patch.name_override = parsed.nameOverride
  if (parsed.priceOverride !== undefined) patch.price_override = parsed.priceOverride
  if (parsed.categoryOverride !== undefined) patch.category_override = parsed.categoryOverride
  if (parsed.detailContentOverride !== undefined) {
    patch.detail_content_override = parsed.detailContentOverride
  }
  if (parsed.platformFields !== undefined) {
    patch.platform_fields = {
      ...((existing?.platform_fields || {}) as Record<string, unknown>),
      ...parsed.platformFields,
    }
  }

  if (existing) {
    const { error } = await supabase.from('market_listings').update(patch).eq('id', existing.id)
    if (error) return { data: null, error: error.message }
    revalidatePath('/products')
    return { data: { listingId: existing.id as string }, error: null }
  }

  const { data, error } = await supabase
    .from('market_listings')
    .insert({
      master_product_id: parsed.masterProductId,
      market_account_id: parsed.marketAccountId,
      ...patch,
    })
    .select('id')
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/products')
  return { data: { listingId: data.id as string }, error: null }
}

// ------------------------------------------------------------------
// Publish / update to the market
// ------------------------------------------------------------------

async function loadListingContext(listingId: string): Promise<
  | {
      listing: MarketListingRow
      master: MasterProductRow
      options: ProductOptionRow[]
      error: null
    }
  | { listing: null; master: null; options: null; error: string }
> {
  const supabase = await createRedesignClient()
  const { data: listingData, error } = await supabase
    .from('market_listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle()

  if (error) return { listing: null, master: null, options: null, error: error.message }
  const listing = listingData as unknown as MarketListingRow | null
  if (!listing) return { listing: null, master: null, options: null, error: '리스팅을 찾을 수 없습니다.' }

  const [{ data: master }, { data: options }] = await Promise.all([
    supabase.from('master_products').select('*').eq('id', listing.master_product_id).maybeSingle(),
    supabase.from('product_options').select('*').eq('master_product_id', listing.master_product_id),
  ])

  if (!master) return { listing: null, master: null, options: null, error: '원본상품을 찾을 수 없습니다.' }

  return {
    listing,
    master: master as unknown as MasterProductRow,
    options: (options || []) as unknown as ProductOptionRow[],
    error: null,
  }
}

export async function publishListing(
  listingId: string,
  confirmation: string
): Promise<{ success: boolean; error: string | null; invalidInputs?: Array<{ field: string; message: string }> }> {
  // The AI-boundary gate: publishing to a market always demands the
  // explicit confirmation token from a user-clicked button.
  if (confirmation !== 'PUBLISH') {
    return { success: false, error: '최종 게시 확인이 필요합니다.' }
  }

  const context = await loadListingContext(listingId)
  if (context.error !== null) return { success: false, error: context.error }
  const { listing, master, options } = context

  const { resolved, error: accountError } = await resolveMarketAccount(listing.market_account_id)
  if (!resolved) return { success: false, error: accountError }

  const draft = buildListingDraft(master, options, listing)
  const issues = resolved.adapter.validateListing(draft)
  if (issues.length > 0) {
    return {
      success: false,
      error: `등록 요건이 충족되지 않았습니다: ${issues.map((i) => i.message).join(' / ')}`,
    }
  }

  const supabase = await createRedesignClient()
  const result = listing.remote_ref
    ? await resolved.adapter.updateListing(listing.remote_ref, draft)
    : await resolved.adapter.publishListing(draft)

  if (!result.ok) {
    // Record the failure; never a success flag
    await supabase
      .from('market_listings')
      .update({ last_error: result.error })
      .eq('id', listingId)
    return { success: false, error: result.error, invalidInputs: result.invalidInputs }
  }

  const { error: saveError } = await supabase
    .from('market_listings')
    .update({
      remote_ref: result.remoteRef,
      remote_refs: result.remoteRefs,
      status: 'published',
      last_published_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', listingId)

  if (saveError) {
    return {
      success: false,
      error: `마켓에는 반영됐지만 로컬 기록에 실패했습니다: ${saveError.message}`,
    }
  }

  revalidatePath('/products')
  return { success: true, error: null }
}

// ------------------------------------------------------------------
// Local vs market diff (대조 뷰)
// ------------------------------------------------------------------

export interface ListingDiffField {
  field: string
  label: string
  localValue: string | number | null
  remoteValue: string | number | null
}

export interface ListingDiff {
  fetchedAt: string
  differs: boolean
  fields: ListingDiffField[]
}

/** Fetch the real market state, store the snapshot, return the diff. */
export async function refreshListingSnapshot(
  listingId: string
): Promise<{ data: ListingDiff | null; error: string | null }> {
  const context = await loadListingContext(listingId)
  if (context.error !== null) return { data: null, error: context.error }
  const { listing, master, options } = context

  if (!listing.remote_ref) return { data: null, error: '아직 마켓에 배포되지 않은 리스팅입니다.' }

  const { resolved, error: accountError } = await resolveMarketAccount(listing.market_account_id)
  if (!resolved) return { data: null, error: accountError }

  let snapshot
  try {
    snapshot = await resolved.adapter.fetchListing(listing.remote_ref)
  } catch (fetchError) {
    return {
      data: null,
      error: fetchError instanceof Error ? fetchError.message : '마켓 상태 조회에 실패했습니다.',
    }
  }

  const supabase = await createRedesignClient()
  await supabase.from('listing_snapshots').insert({
    listing_id: listingId,
    remote_status: snapshot.remoteStatus,
    name: snapshot.name,
    price: snapshot.price,
    stock_quantity: snapshot.stockQuantity,
    category: snapshot.category,
    raw: JSON.parse(JSON.stringify(snapshot.raw ?? {})),
  })
  await supabase
    .from('market_listings')
    .update({ remote_status: snapshot.remoteStatus })
    .eq('id', listingId)

  const draft = buildListingDraft(master, options, listing)
  const fields: ListingDiffField[] = [
    { field: 'name', label: '상품명', localValue: draft.name, remoteValue: snapshot.name },
    { field: 'price', label: '판매가', localValue: draft.price, remoteValue: snapshot.price },
    {
      field: 'stockQuantity',
      label: '재고',
      localValue: draft.stockQuantity,
      remoteValue: snapshot.stockQuantity,
    },
  ]

  return {
    data: {
      fetchedAt: snapshot.fetchedAt.toISOString(),
      differs: fields.some(
        (f) => f.remoteValue !== null && String(f.localValue) !== String(f.remoteValue)
      ),
      fields,
    },
    error: null,
  }
}

export async function getLatestSnapshot(
  listingId: string
): Promise<{ data: ListingSnapshotRow | null; error: string | null }> {
  const supabase = await createRedesignClient()
  const { data, error } = await supabase
    .from('listing_snapshots')
    .select('*')
    .eq('listing_id', listingId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  return { data: (data as ListingSnapshotRow) || null, error: null }
}
