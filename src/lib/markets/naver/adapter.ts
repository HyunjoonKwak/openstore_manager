import { NaverCommerceClient, type NaverOrder } from '../../naver/client.ts'
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
} from '../types'
import { groupNaverOrders } from './mappers.ts'
import { validateNaverListing } from './validate-listing.ts'

const COMMERCE_BASE = 'https://api.commerce.naver.com/external'
const DAY_MS = 24 * 60 * 60 * 1000

// Naver keeps generated product numbers out of clone payloads
const GENERATED_NUMBER_KEYS = [
  'originProductNo',
  'channelProductNo',
  'groupProductNo',
  'windowChannelProductNo',
  'smartstoreChannelProductNo',
]

function removeGeneratedNumbers(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeGeneratedNumbers)
  if (!value || typeof value !== 'object') return value
  const result: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (GENERATED_NUMBER_KEYS.includes(key)) continue
    result[key] = removeGeneratedNumbers(child)
  }
  return result
}

function toPublishError(error: unknown, raw: unknown = null): PublishResult {
  return {
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    invalidInputs: [],
    raw,
  }
}

export interface NaverAdapterConfig {
  clientId: string
  clientSecret: string
  sellerId?: string
}

export class NaverAdapter implements MarketAdapter {
  readonly platform = 'naver' as const
  private client: NaverCommerceClient

  constructor(config: NaverAdapterConfig) {
    this.client = new NaverCommerceClient(config)
  }

  validateListing(input: ListingDraft): ValidationIssue[] {
    const issues = validateNaverListing(input)
    // Publishing a brand-new product clones a same-category template —
    // required until a from-scratch payload builder exists.
    if (!input.platformFields.templateProductNo) {
      issues.push({
        field: 'platformFields.templateProductNo',
        code: 'required',
        message: '같은 상품군의 템플릿 채널 상품번호가 필요합니다.',
      })
    }
    return issues
  }

  private async fetchChannelProduct(channelProductNo: string): Promise<Record<string, unknown>> {
    const token = await this.client.getAccessToken()
    const response = await fetch(`${COMMERCE_BASE}/v2/products/channel-products/${channelProductNo}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;charset=UTF-8' },
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.message || `채널 상품 ${channelProductNo}을(를) 불러오지 못했습니다.`)
    }
    return data as Record<string, unknown>
  }

  private async uploadImageIfDataUri(imageSource: string): Promise<string> {
    const match = imageSource.match(/^data:(image\/(?:jpeg|png|gif|bmp));base64,(.+)$/)
    if (!match) return imageSource

    const mime = match[1]
    const bytes = Buffer.from(match[2], 'base64')
    if (bytes.byteLength > 10 * 1024 * 1024) {
      throw new Error('대표 이미지는 10MB 이하여야 합니다.')
    }

    const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]
    const form = new FormData()
    form.append('imageFiles', new Blob([bytes], { type: mime }), `product-${Date.now()}.${extension}`)

    const token = await this.client.getAccessToken()
    const response = await fetch(`${COMMERCE_BASE}/v1/product-images/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;charset=UTF-8' },
      body: form,
      signal: AbortSignal.timeout(30_000),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || '대표 이미지를 업로드하지 못했습니다.')
    const url = data?.images?.[0]?.url || data?.[0]?.url || data?.imageUrls?.[0]
    if (!url) throw new Error('업로드된 이미지 URL을 확인하지 못했습니다.')
    return String(url)
  }

  async publishListing(input: ListingDraft): Promise<PublishResult> {
    const templateProductNo = String(input.platformFields.templateProductNo || '')
    if (!/^\d+$/.test(templateProductNo)) {
      return toPublishError('같은 상품군의 템플릿 채널 상품번호가 필요합니다.')
    }

    try {
      const template = await this.fetchChannelProduct(templateProductNo)
      if (!template.originProduct || !template.smartstoreChannelProduct) {
        return toPublishError('템플릿 상품 구조를 확인할 수 없습니다.', template)
      }

      const imageUrl = input.imageUrl ? await this.uploadImageIfDataUri(input.imageUrl) : null
      if (!imageUrl) return toPublishError('대표 이미지가 필요합니다.')

      const originProduct = removeGeneratedNumbers(template.originProduct) as Record<string, unknown>
      originProduct.statusType = 'SALE'
      originProduct.name = input.name.trim()
      originProduct.salePrice = Math.round(input.price)
      originProduct.stockQuantity = Math.round(input.stockQuantity)
      if (input.detailContent) {
        originProduct.detailContent = input.detailContent.replaceAll('__PRODUCT_IMAGE_URL__', imageUrl)
      }
      originProduct.images = { representativeImage: { url: imageUrl }, optionalImages: [] }
      if (input.categoryId?.trim()) originProduct.leafCategoryId = input.categoryId.trim()

      const smartstoreChannelProduct = removeGeneratedNumbers(
        template.smartstoreChannelProduct
      ) as Record<string, unknown>
      smartstoreChannelProduct.channelProductName = input.name.trim()
      smartstoreChannelProduct.channelProductDisplayStatusType = 'ON'

      const token = await this.client.getAccessToken()
      const response = await fetch(`${COMMERCE_BASE}/v2/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json;charset=UTF-8',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ originProduct, smartstoreChannelProduct }),
        signal: AbortSignal.timeout(30_000),
      })
      const data = await response.json()

      if (!response.ok) {
        return {
          ok: false,
          error: data?.message || '상품 등록이 거절되었습니다.',
          invalidInputs: Array.isArray(data?.invalidInputs)
            ? data.invalidInputs.map((item: { name?: string; message?: string }) => ({
                field: item.name || 'unknown',
                message: item.message || '',
              }))
            : [],
          raw: data,
        }
      }

      return {
        ok: true,
        remoteRef: String(data.smartstoreChannelProductNo),
        remoteRefs: { originProductNo: String(data.originProductNo) },
        raw: data,
      }
    } catch (error) {
      return toPublishError(error)
    }
  }

  async updateListing(remoteRef: string, input: ListingDraft): Promise<PublishResult> {
    try {
      const channelProduct = await this.fetchChannelProduct(remoteRef)
      const currentOrigin = channelProduct.originProduct as Record<string, unknown> | undefined
      if (!currentOrigin) return toPublishError('상품 구조를 확인할 수 없습니다.', channelProduct)

      const originProductNoRaw = (channelProduct as { originProductNo?: number | string }).originProductNo
      const originProductNo = Number(originProductNoRaw)
      if (!Number.isFinite(originProductNo)) {
        return toPublishError('원상품 번호를 확인할 수 없습니다.', channelProduct)
      }

      // Naver PUT is full-replace: mutate a copy of the fetched payload
      const originProduct = { ...currentOrigin }
      originProduct.name = input.name.trim()
      originProduct.salePrice = Math.round(input.price)
      originProduct.stockQuantity = Math.round(input.stockQuantity)
      if (input.categoryId?.trim()) originProduct.leafCategoryId = input.categoryId.trim()
      if (input.detailContent) originProduct.detailContent = input.detailContent

      const data = await this.client.updateProduct(
        originProductNo,
        { originProduct } as never
      )

      return {
        ok: true,
        remoteRef,
        remoteRefs: { originProductNo: String(originProductNo) },
        raw: data,
      }
    } catch (error) {
      return toPublishError(error)
    }
  }

  async fetchListing(remoteRef: string): Promise<ListingSnapshot> {
    const channelProduct = await this.fetchChannelProduct(remoteRef)
    const origin = (channelProduct.originProduct || {}) as Record<string, unknown>
    const smartstore = (channelProduct.smartstoreChannelProduct || {}) as Record<string, unknown>

    return {
      remoteStatus: (origin.statusType as string) || (smartstore.channelProductDisplayStatusType as string) || null,
      name: (origin.name as string) || null,
      price: typeof origin.salePrice === 'number' ? origin.salePrice : null,
      stockQuantity: typeof origin.stockQuantity === 'number' ? origin.stockQuantity : null,
      category: (origin.leafCategoryId as string) || null,
      raw: channelProduct,
      fetchedAt: new Date(),
    }
  }

  async updateStock(remoteRef: string, stockQuantity: number): Promise<PublishResult> {
    try {
      const channelProduct = await this.fetchChannelProduct(remoteRef)
      const originProductNo = Number((channelProduct as { originProductNo?: number }).originProductNo)
      if (!Number.isFinite(originProductNo)) {
        return toPublishError('원상품 번호를 확인할 수 없습니다.', channelProduct)
      }
      const data = await this.client.updateStock(originProductNo, stockQuantity)
      return {
        ok: true,
        remoteRef,
        remoteRefs: { originProductNo: String(originProductNo) },
        raw: data,
      }
    } catch (error) {
      return toPublishError(error)
    }
  }

  async fetchAllListings(): Promise<RemoteListingSummary[]> {
    const listings: RemoteListingSummary[] = []
    const pageSize = 100

    for (let page = 1; ; page++) {
      const response = await this.client.searchProducts({
        pageSize,
        page,
        productStatusTypes: [
          'SALE', 'OUTOFSTOCK', 'SUSPENSION', 'WAIT',
          'UNADMISSION', 'REJECTION', 'PROHIBITION',
        ],
      })

      const products = response.contents || []
      for (const product of products) {
        const channel = product.channelProducts?.[0]
        if (!channel) continue

        listings.push({
          remoteRef: String(channel.channelProductNo),
          remoteRefs: { originProductNo: String(product.originProductNo) },
          name: channel.name,
          price: channel.discountedPrice || channel.salePrice,
          // OUTOFSTOCK products report stale product-level stock for
          // option products — always record 0 locally
          stockQuantity: channel.statusType === 'OUTOFSTOCK' ? 0 : channel.stockQuantity,
          remoteStatus: channel.statusType,
          imageUrl: channel.representativeImage?.url || null,
          category: channel.wholeCategoryName || null,
          brand: channel.brandName || null,
          sku: channel.sellerManagementCode || null,
          raw: product,
        })
      }

      if (products.length < pageSize) break
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    return listings
  }

  async processClaim(
    marketItemRef: string,
    action: ClaimAction,
    reason?: string
  ): Promise<ClaimResult> {
    try {
      const productOrderId = marketItemRef
      let raw: unknown

      switch (action) {
        case 'confirm_order':
          raw = await this.client.confirmOrders([productOrderId])
          break
        case 'approve_cancel':
          raw = await this.client.approveCancelRequest({ productOrderId })
          break
        case 'reject_cancel':
          if (!reason) return { ok: false, error: '거부 사유가 필요합니다.', raw: null }
          raw = await this.client.rejectCancelRequest({ productOrderId, rejectReason: reason })
          break
        case 'approve_return':
          raw = await this.client.approveReturnRequest({ productOrderId })
          break
        case 'reject_return':
          if (!reason) return { ok: false, error: '거부 사유가 필요합니다.', raw: null }
          raw = await this.client.rejectReturnRequest({ productOrderId, rejectReason: reason })
          break
        case 'approve_exchange':
          raw = await this.client.approveExchangeRequest({ productOrderId })
          break
        case 'reject_exchange':
          if (!reason) return { ok: false, error: '거부 사유가 필요합니다.', raw: null }
          raw = await this.client.rejectExchangeRequest({ productOrderId, rejectReason: reason })
          break
      }

      return { ok: true, error: null, raw }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : '클레임 처리 중 오류',
        raw: null,
      }
    }
  }

  async fetchOrders(range: DateRange): Promise<NormalizedOrder[]> {
    const rows: NaverOrder[] = []

    // Naver limits each query window to 24 hours
    for (let start = range.from.getTime(); start < range.to.getTime(); start += DAY_MS) {
      const chunkEnd = Math.min(start + DAY_MS, range.to.getTime())
      let pageToken: string | undefined

      do {
        const response = await this.client.getOrders({
          fromDate: new Date(start).toISOString(),
          toDate: new Date(chunkEnd).toISOString(),
          pageToken,
        })
        rows.push(...(response.data?.contents || []))
        pageToken = response.data?.pageToken
      } while (pageToken)

      if (chunkEnd < range.to.getTime()) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    return groupNaverOrders(rows)
  }

  async registerShipments(inputs: ShipmentInput[]): Promise<ShipmentResult> {
    const succeeded: string[] = []
    const failed: Array<{ marketItemRef: string; error: string }> = []
    const raws: unknown[] = []

    for (const input of inputs) {
      try {
        const response = await this.client.registerShipment({
          productOrderId: input.marketItemRef,
          deliveryCompanyCode: input.courierCode,
          trackingNumber: input.trackingNumber,
        })
        raws.push(response)

        const fail = response.data.failProductOrderInfos.find(
          (info) => info.productOrderId === input.marketItemRef
        )
        if (fail) {
          failed.push({ marketItemRef: input.marketItemRef, error: fail.message })
        } else {
          succeeded.push(input.marketItemRef)
        }
      } catch (error) {
        failed.push({
          marketItemRef: input.marketItemRef,
          error: error instanceof Error ? error.message : '발송 처리 중 오류',
        })
      }

      if (inputs.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }

    return {
      ok: failed.length === 0,
      partialFailure: succeeded.length > 0 && failed.length > 0,
      succeeded,
      failed,
      raw: raws,
    }
  }

  async fetchSettlements(range: DateRange): Promise<NormalizedSettlement[]> {
    const format = (date: Date) => date.toISOString().slice(0, 10)
    const response = await this.client.getDailySettlements({
      startDate: format(range.from),
      endDate: format(range.to),
    })

    return (response.contents || []).map((row) => ({
      settlementDate: row.settleDate,
      orderCount: row.orderCount,
      salesAmount: row.salesAmount,
      commissionAmount: row.commissionAmount,
      deliveryFeeAmount: row.deliveryFeeAmount,
      discountAmount: row.discountAmount,
      settlementAmount: row.settleAmount,
      remoteRef: null,
      raw: row,
    }))
  }

  async testConnection(): Promise<{ ok: boolean; error: string | null }> {
    try {
      await this.client.getAccessToken()
      return { ok: true, error: null }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '연결 실패' }
    }
  }
}
