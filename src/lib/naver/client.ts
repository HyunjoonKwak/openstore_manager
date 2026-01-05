import bcrypt from 'bcryptjs'

const NAVER_API_BASE_URL = 'https://api.commerce.naver.com'

interface NaverTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

interface NaverApiConfig {
  clientId: string
  clientSecret: string
  sellerId?: string
}

export class NaverCommerceClient {
  private config: NaverApiConfig
  private accessToken: string | null = null
  private tokenExpiresAt: number = 0

  constructor(config: NaverApiConfig) {
    this.config = config
  }

  private async generateSignature(): Promise<{ signature: string; timestamp: number }> {
    const timestamp = Date.now()
    const password = `${this.config.clientId}_${timestamp}`
    const signature = bcrypt.hashSync(password, this.config.clientSecret)
    return {
      signature: Buffer.from(signature).toString('base64'),
      timestamp,
    }
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken
    }

    const { signature, timestamp } = await this.generateSignature()

    const params = new URLSearchParams()
    params.append('client_id', this.config.clientId)
    params.append('timestamp', timestamp.toString())
    params.append('grant_type', 'client_credentials')
    params.append('client_secret_sign', signature)
    params.append('type', this.config.sellerId ? 'SELLER' : 'SELF')
    if (this.config.sellerId) {
      params.append('account_id', this.config.sellerId)
    }

    const response = await fetch(`${NAVER_API_BASE_URL}/external/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get access token: ${error}`)
    }

    const data: NaverTokenResponse = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000

    return this.accessToken
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const token = await this.getAccessToken()

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(`${NAVER_API_BASE_URL}${endpoint}`, options)

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`API request failed: ${response.status} - ${error}`)
    }

    return response.json()
  }

  async getOrders(params: {
    fromDate: string
    toDate?: string
    orderStatus?: string
    pageSize?: number
    pageToken?: string
  }): Promise<NaverOrdersResponse> {
    const searchParams = new URLSearchParams()
    searchParams.append('from', params.fromDate)
    if (params.toDate) searchParams.append('to', params.toDate)
    if (params.orderStatus) searchParams.append('orderStatus', params.orderStatus)
    searchParams.append('rangeType', 'PAYED_DATETIME')
    if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString())
    if (params.pageToken) searchParams.append('pageToken', params.pageToken)

    return this.request<NaverOrdersResponse>(
      'GET',
      `/external/v1/pay-order/seller/product-orders?${searchParams.toString()}`
    )
  }

  async getProducts(params: {
    pageSize?: number
    pageToken?: string
  } = {}): Promise<NaverProductsResponse> {
    const searchParams = new URLSearchParams()
    if (params.pageSize) searchParams.append('size', params.pageSize.toString())
    if (params.pageToken) searchParams.append('page', params.pageToken)

    return this.request<NaverProductsResponse>(
      'GET',
      `/external/v1/products?${searchParams.toString()}`
    )
  }

  async registerShipment(params: {
    productOrderId: string
    deliveryCompanyCode: string
    trackingNumber: string
  }): Promise<NaverShipmentResponse> {
    return this.request<NaverShipmentResponse>(
      'POST',
      '/external/v1/pay-order/seller/product-orders/dispatch',
      {
        dispatchProductOrders: [
          {
            productOrderId: params.productOrderId,
            deliveryMethod: 'DELIVERY',
            deliveryCompanyCode: params.deliveryCompanyCode,
            trackingNumber: params.trackingNumber,
          },
        ],
      }
    )
  }

  async searchProducts(params: {
    keyword?: string
    productStatusTypes?: string[]
    pageSize?: number
    page?: number
  }): Promise<NaverProductsResponse> {
    return this.request<NaverProductsResponse>('POST', '/external/v1/products/search', {
      filter: {
        productName: params.keyword,
        productStatusTypes: params.productStatusTypes || ['SALE'],
      },
      page: params.page || 1,
      size: params.pageSize || 100,
    })
  }
}

export interface NaverOrder {
  productOrderId: string
  orderId: string
  orderDate: string
  productName: string
  productOption: string
  quantity: number
  unitPrice: number
  totalPaymentAmount: number
  orderStatus: string
  ordererName: string
  ordererTel: string
  shippingAddress: {
    name: string
    tel1: string
    baseAddress: string
    detailAddress: string
    zipCode: string
  }
  deliveryCompanyCode?: string
  trackingNumber?: string
}

export interface NaverOrdersResponse {
  data: {
    contents: NaverOrder[]
    totalElements: number
    pageToken?: string
  }
}

export interface NaverChannelProduct {
  originProductNo: number
  channelProductNo: number
  name: string
  sellerManagementCode?: string
  statusType: string
  salePrice: number
  discountedPrice?: number
  stockQuantity: number
  wholeCategoryName?: string
  representativeImage?: {
    url: string
  }
  brandName?: string
  modelName?: string
}

export interface NaverProduct {
  originProductNo: number
  channelProducts: NaverChannelProduct[]
}

export interface NaverProductsResponse {
  contents: NaverProduct[]
  totalElements: number
  page?: number
}

export interface NaverShipmentResponse {
  data: {
    successProductOrderInfos: Array<{
      productOrderId: string
    }>
    failProductOrderInfos: Array<{
      productOrderId: string
      code: string
      message: string
    }>
  }
}

export const NAVER_DELIVERY_COMPANIES = [
  { code: 'CJGLS', name: 'CJ대한통운' },
  { code: 'KGB', name: '로젠택배' },
  { code: 'LOGEN', name: '로젠택배' },
  { code: 'HANJIN', name: '한진택배' },
  { code: 'EPOST', name: '우체국택배' },
  { code: 'LOTTE', name: '롯데택배' },
  { code: 'HDEXP', name: '합동택배' },
  { code: 'CVSNET', name: 'GS편의점택배' },
  { code: 'DAESIN', name: '대신택배' },
  { code: 'ILYANG', name: '일양로지스' },
] as const
