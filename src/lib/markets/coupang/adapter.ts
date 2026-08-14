import type {
  ClaimAction,
  ClaimResult,
  DateRange,
  ListingDraft,
  ListingSnapshot,
  MarketAdapter,
  NormalizedOrder,
  NormalizedSettlement,
  PublishResult,
  RemoteListingSummary,
  ShipmentInput,
  ShipmentResult,
  ValidationIssue,
} from '../types.ts'
import { MarketNotImplementedError } from '../types.ts'

// Coupang WING adapter — structure only. validateListing implements the
// real WING constraints so the interface stays honest to Coupang's
// requirements (HMAC-signed API, displayCategoryCode, vendorId) instead
// of ossifying around Naver. API methods land in a later phase.

export interface CoupangAdapterConfig {
  accessKey: string
  secretKey: string
  vendorId: string
}

const MAX_NAME_LENGTH = 100

export function validateCoupangListing(input: ListingDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!input.name.trim()) {
    issues.push({ field: 'name', code: 'required', message: '상품명이 필요합니다.' })
  } else if (input.name.trim().length > MAX_NAME_LENGTH) {
    issues.push({
      field: 'name',
      code: 'too_long',
      message: `상품명은 ${MAX_NAME_LENGTH}자 이하여야 합니다.`,
    })
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    issues.push({ field: 'price', code: 'invalid', message: '판매가는 0보다 커야 합니다.' })
  } else if (input.price % 10 !== 0) {
    // Coupang rejects prices that are not multiples of 10 won
    issues.push({ field: 'price', code: 'invalid_unit', message: '쿠팡 판매가는 10원 단위여야 합니다.' })
  }

  if (!input.categoryId?.trim()) {
    issues.push({
      field: 'categoryId',
      code: 'required',
      message: '쿠팡 노출 카테고리 코드(displayCategoryCode)가 필요합니다.',
    })
  }

  if (!input.imageUrl) {
    issues.push({ field: 'imageUrl', code: 'required', message: '대표 이미지가 필요합니다.' })
  }

  if (!input.brand?.trim()) {
    issues.push({ field: 'brand', code: 'required', message: '쿠팡 등록에는 브랜드명이 필요합니다.' })
  }

  return issues
}

export class CoupangAdapter implements MarketAdapter {
  readonly platform = 'coupang' as const
  private config: CoupangAdapterConfig

  // Config is accepted now so settings UI can store credentials before
  // the API methods exist.
  constructor(config: CoupangAdapterConfig) {
    this.config = config
  }

  validateListing(input: ListingDraft): ValidationIssue[] {
    return validateCoupangListing(input)
  }

  async publishListing(_input: ListingDraft): Promise<PublishResult> {
    void _input
    throw new MarketNotImplementedError('coupang', 'publishListing')
  }

  async updateListing(_remoteRef: string, _input: ListingDraft): Promise<PublishResult> {
    void _remoteRef
    void _input
    throw new MarketNotImplementedError('coupang', 'updateListing')
  }

  async fetchListing(_remoteRef: string): Promise<ListingSnapshot> {
    void _remoteRef
    throw new MarketNotImplementedError('coupang', 'fetchListing')
  }

  async updateStock(_remoteRef: string, _stockQuantity: number): Promise<PublishResult> {
    void _remoteRef
    void _stockQuantity
    throw new MarketNotImplementedError('coupang', 'updateStock')
  }

  async fetchAllListings(): Promise<RemoteListingSummary[]> {
    throw new MarketNotImplementedError('coupang', 'fetchAllListings')
  }

  async processClaim(
    _marketItemRef: string,
    _action: ClaimAction,
    _reason?: string
  ): Promise<ClaimResult> {
    void _marketItemRef
    void _action
    void _reason
    throw new MarketNotImplementedError('coupang', 'processClaim')
  }

  async fetchOrders(_range: DateRange): Promise<NormalizedOrder[]> {
    void _range
    throw new MarketNotImplementedError('coupang', 'fetchOrders')
  }

  async registerShipments(_inputs: ShipmentInput[]): Promise<ShipmentResult> {
    void _inputs
    throw new MarketNotImplementedError('coupang', 'registerShipments')
  }

  async fetchSettlements(_range: DateRange): Promise<NormalizedSettlement[]> {
    void _range
    throw new MarketNotImplementedError('coupang', 'fetchSettlements')
  }

  async testConnection(): Promise<{ ok: boolean; error: string | null }> {
    if (!this.config.accessKey || !this.config.secretKey || !this.config.vendorId) {
      return { ok: false, error: 'Access Key, Secret Key, Vendor ID를 모두 입력해주세요.' }
    }
    return { ok: false, error: '쿠팡 연동은 아직 준비 중입니다.' }
  }
}
