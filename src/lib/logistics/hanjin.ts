/**
 * 한진택배 API 연동 모듈
 * 
 * 기능:
 * - 운송장 등록 (registerHanjinShipment)
 * - 배송 조회 (trackHanjinPackage)
 * - 테스트 모드 지원 (실제 API 호출 없이 Mock 데이터 반환)
 */

// ============================================
// Types
// ============================================

export interface HanjinTrackingResult {
  success: boolean
  trackingNumber: string
  status: string
  statusCode: string
  currentLocation: string
  deliveredAt: string | null
  estimatedDelivery?: string | null
  history: HanjinTrackingHistory[]
  error?: string
  isTestMode?: boolean
}

export interface HanjinTrackingHistory {
  date: string
  time: string
  location: string
  status: string
  description: string
}

export interface HanjinApiConfig {
  apiKey?: string
  apiSecret?: string
  testMode?: boolean
  customerId?: string  // 한진택배 고객번호
}

export interface RegisterShipmentInput {
  orderId: string
  senderName: string
  senderTel: string
  senderAddress: string
  senderZipCode?: string
  receiverName: string
  receiverTel: string
  receiverAddress: string
  receiverZipCode: string
  productName: string
  quantity: number
  weight?: number      // kg
  boxCount?: number    // 박스 수량
  memo?: string
  requestDate?: string // 희망 수거일
}

export interface RegisterShipmentResult {
  success: boolean
  trackingNumber?: string
  reservationNumber?: string  // 예약번호 (한진택배 집하예약)
  error?: string
  isTestMode?: boolean
}

// ============================================
// Constants
// ============================================

export const HANJIN_STATUS_MAP: Record<string, string> = {
  '접수': 'Ordered',
  '집하': 'Ordered',
  '간선상차': 'Shipped',
  '간선하차': 'Shipped',
  '배송출발': 'Shipped',
  '배송중': 'Shipped',
  '배송완료': 'Delivered',
  '인수확인': 'Delivered',
}

export const HANJIN_STATUS_CODES = {
  RECEIVED: { code: 'RECEIVED', label: '접수', orderStatus: 'Ordered' },
  PICKED_UP: { code: 'PICKED_UP', label: '집하', orderStatus: 'Ordered' },
  IN_TRANSIT: { code: 'IN_TRANSIT', label: '배송중', orderStatus: 'Shipped' },
  OUT_FOR_DELIVERY: { code: 'OUT_FOR_DELIVERY', label: '배송출발', orderStatus: 'Shipped' },
  DELIVERED: { code: 'DELIVERED', label: '배송완료', orderStatus: 'Delivered' },
  EXCEPTION: { code: 'EXCEPTION', label: '배송이상', orderStatus: 'Shipped' },
} as const

// ============================================
// Mock Data Generators (테스트 모드용)
// ============================================

function generateMockTrackingNumber(): string {
  const prefix = 'TEST'
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

function generateMockTrackingHistory(trackingNumber: string): HanjinTrackingHistory[] {
  const now = new Date()
  const history: HanjinTrackingHistory[] = []
  
  // 3일 전: 접수
  const day1 = new Date(now)
  day1.setDate(day1.getDate() - 3)
  history.push({
    date: day1.toISOString().split('T')[0],
    time: '14:30',
    location: '발송지 (서울 강남)',
    status: '접수',
    description: `상품이 접수되었습니다. 운송장번호: ${trackingNumber}`,
  })
  
  // 2일 전: 집하
  const day2 = new Date(now)
  day2.setDate(day2.getDate() - 2)
  history.push({
    date: day2.toISOString().split('T')[0],
    time: '09:15',
    location: '서울 강남 영업소',
    status: '집하',
    description: '담당 기사님이 상품을 인수하였습니다.',
  })
  
  // 1일 전: 간선상차
  const day3 = new Date(now)
  day3.setDate(day3.getDate() - 1)
  history.push({
    date: day3.toISOString().split('T')[0],
    time: '20:00',
    location: '서울 물류센터',
    status: '간선상차',
    description: '물류센터에서 상차되었습니다.',
  })
  
  // 당일: 배송출발
  history.push({
    date: now.toISOString().split('T')[0],
    time: '07:30',
    location: '부산 해운대 영업소',
    status: '배송출발',
    description: '배송 기사님이 상품을 가지고 출발하였습니다.',
  })
  
  return history
}

function generateMockDeliveredHistory(trackingNumber: string): HanjinTrackingHistory[] {
  const history = generateMockTrackingHistory(trackingNumber)
  const now = new Date()
  
  history.push({
    date: now.toISOString().split('T')[0],
    time: '15:45',
    location: '부산 해운대구',
    status: '배송완료',
    description: '배송이 완료되었습니다. (본인수령)',
  })
  
  return history
}

// ============================================
// API Functions
// ============================================

/**
 * 운송장 등록 (배송 접수)
 * 
 * @param input 발송 정보
 * @param config API 설정 (testMode: true면 실제 API 호출 없이 Mock 데이터 반환)
 */
export async function registerHanjinShipment(
  input: RegisterShipmentInput,
  config?: HanjinApiConfig
): Promise<RegisterShipmentResult> {
  const isTestMode = config?.testMode ?? !config?.apiKey
  
  // 테스트 모드: Mock 데이터 반환
  if (isTestMode) {
    // 시뮬레이션을 위한 약간의 딜레이
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const mockTrackingNumber = generateMockTrackingNumber()
    const reservationNumber = `RSV${Date.now().toString().slice(-10)}`
    
    return {
      success: true,
      trackingNumber: mockTrackingNumber,
      reservationNumber,
      isTestMode: true,
    }
  }
  
  // 실제 API 호출
  try {
    // 한진택배 API 엔드포인트 (실제 연동 시 수정 필요)
    // 한진택배는 공식 API가 제한적이므로, 실제로는 한진택배 계약 후 제공받는 API 문서 참조
    const apiEndpoint = 'https://api.hanjin.co.kr/shipment/register'
    
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config?.apiKey}`,
        'X-API-Secret': config?.apiSecret || '',
        'X-Customer-ID': config?.customerId || '',
      },
      body: JSON.stringify({
        sender: {
          name: input.senderName,
          tel: input.senderTel,
          address: input.senderAddress,
          zipCode: input.senderZipCode,
        },
        receiver: {
          name: input.receiverName,
          tel: input.receiverTel,
          address: input.receiverAddress,
          zipCode: input.receiverZipCode,
        },
        product: {
          name: input.productName,
          quantity: input.quantity,
          weight: input.weight || 1,
          boxCount: input.boxCount || 1,
        },
        memo: input.memo,
        requestDate: input.requestDate,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || `API 요청 실패: ${response.status}`,
        isTestMode: false,
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      trackingNumber: data.trackingNumber,
      reservationNumber: data.reservationNumber,
      isTestMode: false,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // API 연결 실패 시 테스트 모드로 폴백 (개발 환경에서만)
    if (process.env.NODE_ENV === 'development') {
      console.warn('[한진택배] API 연결 실패, 테스트 모드로 전환:', errorMessage)
      const mockTrackingNumber = generateMockTrackingNumber()
      return {
        success: true,
        trackingNumber: mockTrackingNumber,
        isTestMode: true,
      }
    }
    
    return {
      success: false,
      error: errorMessage,
      isTestMode: false,
    }
  }
}

/**
 * 배송 조회
 * 
 * @param trackingNumber 운송장 번호
 * @param config API 설정 (testMode: true면 실제 API 호출 없이 Mock 데이터 반환)
 */
export async function trackHanjinPackage(
  trackingNumber: string,
  config?: HanjinApiConfig
): Promise<HanjinTrackingResult> {
  const isTestMode = config?.testMode ?? trackingNumber.startsWith('TEST')
  
  // 테스트 모드: Mock 데이터 반환
  if (isTestMode) {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // TEST로 시작하는 운송장은 테스트 데이터
    // TESTDEL로 시작하면 배송완료 상태로 반환
    const isDelivered = trackingNumber.startsWith('TESTDEL')
    
    if (isDelivered) {
      return {
        success: true,
        trackingNumber,
        status: '배송완료',
        statusCode: 'DELIVERED',
        currentLocation: '부산 해운대구',
        deliveredAt: new Date().toISOString(),
        history: generateMockDeliveredHistory(trackingNumber),
        isTestMode: true,
      }
    }
    
    return {
      success: true,
      trackingNumber,
      status: '배송중',
      statusCode: 'IN_TRANSIT',
      currentLocation: '부산 해운대 영업소',
      deliveredAt: null,
      estimatedDelivery: new Date(Date.now() + 86400000).toISOString().split('T')[0], // 내일
      history: generateMockTrackingHistory(trackingNumber),
      isTestMode: true,
    }
  }
  
  // 실제 API 호출
  try {
    // 한진택배 조회 API
    // 실제로는 한진택배에서 제공하는 API 문서 참조
    const response = await fetch(
      `https://trace.hanjin.co.kr/tracking?trackingNumber=${encodeURIComponent(trackingNumber)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      // API 실패 시 웹 스크래핑 폴백 또는 에러 반환
      return {
        success: false,
        trackingNumber,
        status: 'Unknown',
        statusCode: 'ERROR',
        currentLocation: '',
        deliveredAt: null,
        history: [],
        error: `API request failed: ${response.status}`,
        isTestMode: false,
      }
    }

    // 실제 응답 파싱 (한진택배 API 응답 구조에 맞게 수정 필요)
    const data = await response.json()
    
    return {
      success: true,
      trackingNumber,
      status: data.status || '배송중',
      statusCode: data.statusCode || 'IN_TRANSIT',
      currentLocation: data.currentLocation || '',
      deliveredAt: data.deliveredAt || null,
      history: data.history || [],
      isTestMode: false,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // 개발 환경에서 API 실패 시 테스트 데이터 반환
    if (process.env.NODE_ENV === 'development') {
      console.warn('[한진택배] 조회 API 실패, 테스트 데이터 반환:', errorMessage)
      return {
        success: true,
        trackingNumber,
        status: '배송중',
        statusCode: 'IN_TRANSIT',
        currentLocation: '테스트 물류센터',
        deliveredAt: null,
        history: generateMockTrackingHistory(trackingNumber),
        isTestMode: true,
      }
    }
    
    return {
      success: false,
      trackingNumber,
      status: 'Unknown',
      statusCode: 'ERROR',
      currentLocation: '',
      deliveredAt: null,
      history: [],
      error: errorMessage,
      isTestMode: false,
    }
  }
}

/**
 * 한진택배 상태를 주문 상태로 매핑
 */
export function mapStatusToOrderStatus(hanjinStatus: string): string {
  return HANJIN_STATUS_MAP[hanjinStatus] || 'Shipped'
}

// ============================================
// Courier Codes (다중 택배사 지원)
// ============================================

export const COURIER_CODES = {
  HANJIN: {
    code: 'HANJIN',
    name: '한진택배',
    trackingUrlTemplate: 'https://www.hanjin.co.kr/kor/CMS/DeliveryMgr/WaybillResult.do?mCode=MN038&schLang=KR&wblnumText2={trackingNumber}',
    supportedFeatures: ['register', 'track', 'pickup'],
  },
  CJGLS: {
    code: 'CJGLS',
    name: 'CJ대한통운',
    trackingUrlTemplate: 'https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo={trackingNumber}',
    supportedFeatures: ['track'],
  },
  LOTTE: {
    code: 'LOTTE',
    name: '롯데택배',
    trackingUrlTemplate: 'https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo={trackingNumber}',
    supportedFeatures: ['track'],
  },
  LOGEN: {
    code: 'LOGEN',
    name: '로젠택배',
    trackingUrlTemplate: 'https://www.ilogen.com/web/personal/trace/{trackingNumber}',
    supportedFeatures: ['track'],
  },
  EPOST: {
    code: 'EPOST',
    name: '우체국택배',
    trackingUrlTemplate: 'https://service.epost.go.kr/trace.RetrieveDomRi498.comm?sid1={trackingNumber}',
    supportedFeatures: ['track'],
  },
} as const

export type CourierCode = keyof typeof COURIER_CODES

/**
 * 택배사 조회 URL 생성
 */
export function getTrackingUrl(courierCode: string, trackingNumber: string): string {
  const courier = COURIER_CODES[courierCode as CourierCode]
  if (!courier) {
    return ''
  }
  return courier.trackingUrlTemplate.replace('{trackingNumber}', trackingNumber)
}

/**
 * 택배사 목록 조회
 */
export function getCourierList() {
  return Object.values(COURIER_CODES).map(courier => ({
    code: courier.code,
    name: courier.name,
    supportedFeatures: courier.supportedFeatures,
  }))
}

/**
 * 운송장 번호 유효성 검사 (한진택배)
 * 한진택배 운송장 번호는 일반적으로 10~12자리 숫자
 */
export function validateHanjinTrackingNumber(trackingNumber: string): boolean {
  // 테스트 모드 운송장 허용
  if (trackingNumber.startsWith('TEST')) {
    return true
  }
  
  // 숫자만 추출
  const digitsOnly = trackingNumber.replace(/\D/g, '')
  
  // 10~14자리 숫자
  return digitsOnly.length >= 10 && digitsOnly.length <= 14
}
