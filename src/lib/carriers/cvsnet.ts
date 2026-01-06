import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

interface CVSnetTrackingInfo {
  code?: number
  msg?: string
  carrierName?: string
  carrierType?: string
  goodsName?: string
  serviceName?: string
  serviceType?: string
  sender?: {
    name: string | null
    tel: string | null
    baseAddress: string | null
    detailAddress: string | null
  }
  receiver?: {
    name: string | null
    tel: string | null
    baseAddress: string | null
    detailAddress: string | null
  }
  trackingDetails: Array<{
    transCode: string
    transKind: string
    transTime: string
    transWhere: string
    level: number
  }>
}

export class CVSnetScraper extends CarrierScraper {
  readonly carrierId = 'CVSNET'
  readonly carrierName = 'CVS편의점택배'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const queryString = new URLSearchParams({
        invoice_no: trackingNumber,
      }).toString()

      const response = await fetch(
        `https://www.cvsnet.co.kr/invoice/tracking.do?${queryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const html = await response.text()

      const trackingInfoRegex = /var\s+trackingInfo\s*=\s*({[\s\S]*?});\s*\n/
      const match = html.match(trackingInfoRegex)

      if (!match) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      let trackingInfo: CVSnetTrackingInfo
      try {
        trackingInfo = JSON.parse(match[1])
      } catch {
        return this.createErrorResult(trackingNumber, '배송 정보 파싱 실패')
      }

      if (typeof trackingInfo?.code === 'number' && [100, 400, 404].includes(trackingInfo.code)) {
        return this.createErrorResult(trackingNumber, trackingInfo.msg || '배송 정보를 찾을 수 없습니다.')
      }

      const events: TrackEvent[] = trackingInfo.trackingDetails.map((detail) => {
        const statusCode = this.parseStatusCode(detail.transCode)
        return this.createEvent(
          statusCode,
          detail.transKind,
          this.parseDateTime(detail.transTime, null, 'iso'),
          detail.transWhere,
          `${detail.transKind} 하였습니다.`
        )
      })

      return this.createSuccessResult(
        trackingNumber,
        events,
        trackingInfo.sender?.name ? { name: trackingInfo.sender.name } : null,
        trackingInfo.receiver?.name ? { name: trackingInfo.receiver.name } : null
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseStatusCode(transCode: string): TrackEventStatusCode {
    switch (transCode) {
      case 'C01':
        return 'INFORMATION_RECEIVED'
      case 'C015':
        return 'AT_PICKUP'
      case 'C02':
      case 'C03':
      case 'C04':
      case 'C07':
      case 'C08':
      case 'C09':
        return 'IN_TRANSIT'
      case 'C095':
        return 'OUT_FOR_DELIVERY'
      case 'C10':
        return 'AVAILABLE_FOR_PICKUP'
      case 'C11':
        return 'DELIVERED'
      case '11':
        return 'AT_PICKUP'
      case '21':
      case '41':
      case '42':
        return 'IN_TRANSIT'
      case '82':
        return 'OUT_FOR_DELIVERY'
      case '91':
        return 'DELIVERED'
      default:
        return 'UNKNOWN'
    }
  }
}
