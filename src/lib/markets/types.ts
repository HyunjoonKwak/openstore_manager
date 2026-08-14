// Market adapter layer — market-neutral contracts.
// Higher layers (actions, UI) speak only these types; platform-specific
// fields must never leak upward.

export type MarketPlatform = 'naver' | 'coupang'

export interface DateRange {
  from: Date
  to: Date
}

// ------------------------------------------------------------------
// Listing draft: master product merged with per-market overrides.
// Built by the actions layer (NULL override = inherit from master).
// ------------------------------------------------------------------
export interface ListingDraftOption {
  displayName: string
  sku: string | null
  priceDelta: number
  stockQuantity: number
}

export interface ListingDraft {
  name: string
  price: number
  stockQuantity: number
  /** Platform leaf category id (Naver leafCategoryId, Coupang displayCategoryCode) */
  categoryId: string | null
  detailContent: string | null
  imageUrl: string | null
  extraImageUrls: string[]
  brand: string | null
  options: ListingDraftOption[]
  /** Platform-specific extras stored on market_listings.platform_fields */
  platformFields: Record<string, unknown>
}

// ------------------------------------------------------------------
// Validation — pure, no API calls. Feeds the "준비 안 됨" badge.
// ------------------------------------------------------------------
export interface ValidationIssue {
  field: string
  code: string
  message: string
}

// ------------------------------------------------------------------
// Publish / update results. `raw` keeps the platform response for
// listing_snapshots; errors are values, not thrown, so callers cannot
// accidentally record success on failure.
// ------------------------------------------------------------------
export type PublishResult =
  | {
      ok: true
      /** Primary remote identifier (market_listings.remote_ref) */
      remoteRef: string
      /** Extra platform identifiers (market_listings.remote_refs) */
      remoteRefs: Record<string, string>
      raw: unknown
    }
  | {
      ok: false
      error: string
      /** Field-level rejections from the platform, when available */
      invalidInputs: Array<{ field: string; message: string }>
      raw: unknown
    }

// ------------------------------------------------------------------
// Snapshot of what the market actually returned. Stored append-only
// in listing_snapshots and never merged into local values.
// ------------------------------------------------------------------
export interface ListingSnapshot {
  remoteStatus: string | null
  name: string | null
  price: number | null
  stockQuantity: number | null
  category: string | null
  raw: unknown
  fetchedAt: Date
}

// ------------------------------------------------------------------
// Orders normalized to the orders/order_items shape.
// ------------------------------------------------------------------
export type OrderItemStatus =
  | 'New'
  | 'Ordered'
  | 'Dispatched'
  | 'Delivering'
  | 'Delivered'
  | 'Confirmed'
  | 'CancelRequested'
  | 'Cancelled'
  | 'ReturnRequested'
  | 'Returned'
  | 'ExchangeRequested'
  | 'Exchanged'

export interface NormalizedOrderItem {
  /** Market line id (e.g. Naver productOrderId) */
  marketItemRef: string
  productName: string
  optionName: string | null
  /** Remote product ref to resolve the listing (e.g. Naver channelProductNo) */
  remoteProductRef: string | null
  quantity: number
  unitPrice: number | null
  totalAmount: number | null
  status: OrderItemStatus
  marketStatusRaw: string
  trackingNumber: string | null
  courierCode: string | null
}

export interface NormalizedOrder {
  /** Market order id (e.g. Naver orderId) */
  marketOrderRef: string
  orderedAt: Date
  ordererName: string | null
  ordererTel: string | null
  receiverName: string | null
  receiverTel: string | null
  receiverAddress: string | null
  zipCode: string | null
  deliveryMemo: string | null
  totalPaymentAmount: number | null
  items: NormalizedOrderItem[]
  raw: unknown
}

// ------------------------------------------------------------------
// Shipment registration. partialFailure forces callers to look at
// per-item outcomes — an API that quietly failed must not be recorded
// as success.
// ------------------------------------------------------------------
export interface ShipmentInput {
  marketItemRef: string
  courierCode: string
  trackingNumber: string
}

export interface ShipmentResult {
  ok: boolean
  partialFailure: boolean
  succeeded: string[]
  failed: Array<{ marketItemRef: string; error: string }>
  raw: unknown
}

// ------------------------------------------------------------------
// Full listing pull (initial migration + periodic product sync)
// ------------------------------------------------------------------
export interface RemoteListingSummary {
  remoteRef: string
  remoteRefs: Record<string, string>
  name: string
  price: number
  stockQuantity: number
  remoteStatus: string
  imageUrl: string | null
  category: string | null
  brand: string | null
  sku: string | null
  raw: unknown
}

// ------------------------------------------------------------------
// Claim handling (cancel / return / exchange, plus order confirm)
// ------------------------------------------------------------------
export type ClaimAction =
  | 'confirm_order'
  | 'approve_cancel'
  | 'reject_cancel'
  | 'approve_return'
  | 'reject_return'
  | 'approve_exchange'
  | 'reject_exchange'

export interface ClaimResult {
  ok: boolean
  error: string | null
  raw: unknown
}

// ------------------------------------------------------------------
// Settlements
// ------------------------------------------------------------------
export interface NormalizedSettlement {
  settlementDate: string // YYYY-MM-DD
  orderCount: number
  salesAmount: number
  commissionAmount: number
  deliveryFeeAmount: number
  discountAmount: number
  settlementAmount: number
  remoteRef: string | null
  raw: unknown
}

// ------------------------------------------------------------------
// The adapter contract
// ------------------------------------------------------------------
export interface MarketAdapter {
  readonly platform: MarketPlatform

  /** Pure, synchronous, no API calls — safe to run over N list rows. */
  validateListing(input: ListingDraft): ValidationIssue[]

  publishListing(input: ListingDraft): Promise<PublishResult>
  updateListing(remoteRef: string, input: ListingDraft): Promise<PublishResult>
  fetchListing(remoteRef: string): Promise<ListingSnapshot>
  updateStock(remoteRef: string, stockQuantity: number): Promise<PublishResult>

  /** Pull every product on the market account (initial migration + sync). */
  fetchAllListings(): Promise<RemoteListingSummary[]>

  fetchOrders(range: DateRange): Promise<NormalizedOrder[]>
  registerShipments(inputs: ShipmentInput[]): Promise<ShipmentResult>
  processClaim(marketItemRef: string, action: ClaimAction, reason?: string): Promise<ClaimResult>

  fetchSettlements(range: DateRange): Promise<NormalizedSettlement[]>

  /** Cheap connectivity/credential check for settings UI. */
  testConnection(): Promise<{ ok: boolean; error: string | null }>
}

export class MarketNotImplementedError extends Error {
  constructor(platform: MarketPlatform, operation: string) {
    super(`${platform} 어댑터의 ${operation}은 아직 구현되지 않았습니다.`)
    this.name = 'MarketNotImplementedError'
  }
}
