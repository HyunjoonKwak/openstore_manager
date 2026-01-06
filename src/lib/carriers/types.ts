export type TrackEventStatusCode =
  | 'UNKNOWN'
  | 'INFORMATION_RECEIVED'
  | 'AT_PICKUP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'ATTEMPT_FAIL'
  | 'DELIVERED'
  | 'AVAILABLE_FOR_PICKUP'
  | 'EXCEPTION'

export interface TrackEvent {
  status: {
    code: TrackEventStatusCode
    name: string | null
  }
  time: string | null
  location: string | null
  description: string | null
}

export interface TrackInfo {
  success: boolean
  carrier: {
    id: string
    name: string
  }
  trackingNumber: string
  sender: {
    name: string | null
    address?: string | null
  } | null
  recipient: {
    name: string | null
    address?: string | null
  } | null
  productName?: string | null
  events: TrackEvent[]
  error?: string
}

export interface CarrierInfo {
  id: string
  name: string
  displayName: string
  trackingNumberPattern?: RegExp
  trackingNumberLength?: number[]
  testTrackingNumber?: string
}

export const CARRIERS: Record<string, CarrierInfo> = {
  HANJIN: {
    id: 'HANJIN',
    name: 'kr.hanjin',
    displayName: '한진택배',
    trackingNumberLength: [12, 14],
    testTrackingNumber: '418011254849',
  },
  CJ: {
    id: 'CJ',
    name: 'kr.cjlogistics',
    displayName: 'CJ대한통운',
    trackingNumberLength: [10, 12],
    testTrackingNumber: '640599804680',
  },
  LOGEN: {
    id: 'LOGEN',
    name: 'kr.logen',
    displayName: '로젠택배',
    testTrackingNumber: '96aborz71319',
  },
  EPOST: {
    id: 'EPOST',
    name: 'kr.epost',
    displayName: '우체국택배',
    trackingNumberLength: [13],
    testTrackingNumber: '6900083513037',
  },
  LOTTE: {
    id: 'LOTTE',
    name: 'kr.lotte',
    displayName: '롯데택배',
    trackingNumberLength: [12],
    testTrackingNumber: '224756097473',
  },
  COUPANG: {
    id: 'COUPANG',
    name: 'kr.coupangls',
    displayName: '쿠팡 로켓배송',
    testTrackingNumber: '',
  },
  KDEXP: {
    id: 'KDEXP',
    name: 'kr.kdexp',
    displayName: '경동택배',
    testTrackingNumber: '',
  },
  DAESIN: {
    id: 'DAESIN',
    name: 'kr.daesin',
    displayName: '대신택배',
    testTrackingNumber: '',
  },
  CVSNET: {
    id: 'CVSNET',
    name: 'kr.cvsnet',
    displayName: 'CVS편의점택배',
    testTrackingNumber: '',
  },
  CHUNILPS: {
    id: 'CHUNILPS',
    name: 'kr.chunilps',
    displayName: '천일택배',
    testTrackingNumber: '',
  },
  KUNYOUNG: {
    id: 'KUNYOUNG',
    name: 'kr.kunyoung',
    displayName: '건영택배',
    testTrackingNumber: '',
  },
  ILYANGLOGIS: {
    id: 'ILYANGLOGIS',
    name: 'kr.ilyanglogis',
    displayName: '일양로지스',
    testTrackingNumber: '',
  },
  HONAMLOGIS: {
    id: 'HONAMLOGIS',
    name: 'kr.honamlogis',
    displayName: '호남물류',
    testTrackingNumber: '',
  },
  CWAY: {
    id: 'CWAY',
    name: 'kr.cway',
    displayName: '합동택배',
    testTrackingNumber: '',
  },
  HOMEPICK: {
    id: 'HOMEPICK',
    name: 'kr.homepick',
    displayName: '홈픽',
    testTrackingNumber: '',
  },
  EPANTOS: {
    id: 'EPANTOS',
    name: 'kr.epantos',
    displayName: '판토스',
    testTrackingNumber: '',
  },
  SLX: {
    id: 'SLX',
    name: 'kr.slx',
    displayName: 'SLX',
    testTrackingNumber: '',
  },
  TODAYPICKUP: {
    id: 'TODAYPICKUP',
    name: 'kr.todaypickup',
    displayName: '오늘의픽업',
    testTrackingNumber: '',
  },
  YONGMALOGIS: {
    id: 'YONGMALOGIS',
    name: 'kr.yongmalogis',
    displayName: '용마로지스',
    testTrackingNumber: '',
  },
  EPOST_EMS: {
    id: 'EPOST_EMS',
    name: 'kr.epost.ems',
    displayName: '우체국 EMS',
    testTrackingNumber: '',
  },
  LOTTE_GLOBAL: {
    id: 'LOTTE_GLOBAL',
    name: 'kr.lotte.global',
    displayName: '롯데글로벌로지스',
    testTrackingNumber: '',
  },
  GOODSTOLUCK: {
    id: 'GOODSTOLUCK',
    name: 'kr.goodstoluck',
    displayName: '굿투럭',
    testTrackingNumber: '',
  },
}

export function getCarrierById(id: string): CarrierInfo | null {
  return CARRIERS[id.toUpperCase()] ?? null
}

export function getCarrierByName(name: string): CarrierInfo | null {
  return Object.values(CARRIERS).find((c) => c.name === name) ?? null
}

export function getAllCarriers(): CarrierInfo[] {
  return Object.values(CARRIERS)
}

export function predictCarriers(trackingNumber: string): CarrierInfo[] {
  const cleaned = trackingNumber.replace(/[\s-]/g, '')
  if (!cleaned) return []

  const predictions: CarrierInfo[] = []

  if (/^\d{10}$/.test(cleaned)) {
    predictions.push(CARRIERS.CJ)
  }
  if (/^\d{12}$/.test(cleaned)) {
    predictions.push(CARRIERS.HANJIN, CARRIERS.CJ, CARRIERS.LOTTE)
  }
  if (/^\d{13}$/.test(cleaned)) {
    predictions.push(CARRIERS.EPOST)
  }
  if (/^\d{14}$/.test(cleaned)) {
    predictions.push(CARRIERS.HANJIN)
  }
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(cleaned)) {
    predictions.push(CARRIERS.EPOST_EMS)
  }
  if (/^\d{11}$/.test(cleaned)) {
    predictions.push(CARRIERS.LOGEN, CARRIERS.KDEXP)
  }
  if (/^[A-Za-z0-9]{12}$/.test(cleaned) && /[A-Za-z]/.test(cleaned)) {
    predictions.push(CARRIERS.LOGEN)
  }

  const uniqueIds = new Set<string>()
  return predictions.filter((carrier) => {
    if (uniqueIds.has(carrier.id)) return false
    uniqueIds.add(carrier.id)
    return true
  })
}
