import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

interface LotteGlobalTrackResponse {
  responseHeader: {
    result: string
    message: string
  }
  trackingEvents: {
    trackingEvents: Array<{
      description: string
      date: string
      time: string
    }>
  } | null
}

export class LotteGlobalScraper extends CarrierScraper {
  readonly carrierId = 'LOTTE_GLOBAL'
  readonly carrierName = '롯데글로벌로지스'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const response = await fetch(
        'https://www.lotteglogis.com/home/reservation/global/track_ajax',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: new URLSearchParams({ inv_no: trackingNumber }).toString(),
        }
      )

      const data: LotteGlobalTrackResponse = await response.json()

      if (data.responseHeader.result === 'error') {
        if (data.responseHeader.message.includes("does't exists")) {
          return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
        }
        return this.createErrorResult(trackingNumber, data.responseHeader.message)
      }

      if (!data.trackingEvents) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const events: TrackEvent[] = data.trackingEvents.trackingEvents.map((event) => {
        const statusInfo = this.parseStatus(event.description)
        return this.createEvent(
          statusInfo.code,
          statusInfo.name,
          this.parseLotteGlobalDateTime(event.date, event.time),
          null,
          event.description
        )
      })

      return this.createSuccessResult(trackingNumber, events)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseLotteGlobalDateTime(date: string, time: string): string | null {
    try {
      const year = parseInt(date.substring(0, 4))
      const month = parseInt(date.substring(4, 6)) - 1
      const day = parseInt(date.substring(6, 8))
      const hour = parseInt(time.substring(0, 2))
      const minute = parseInt(time.substring(2, 4))
      const dateTime = new Date(year, month, day, hour, minute)
      return dateTime.toISOString()
    } catch {
      return null
    }
  }

  private parseStatus(description: string): { code: TrackEventStatusCode; name: string | null } {
    const textStatusMappingList: Array<[TrackEventStatusCode, string, string]> = [
      ['IN_TRANSIT', '상품 발송', '상품을 발송'],
      ['IN_TRANSIT', '해외창고 입고', '해외창고에 입고'],
      ['IN_TRANSIT', '발송주문 접수', '발송주문 접수'],
      ['IN_TRANSIT', '수입신고', '수입신고'],
      ['IN_TRANSIT', '통관처리', '통관처리'],
      ['IN_TRANSIT', '입고', '입고'],
      ['IN_TRANSIT', '출고', '출고'],
      ['IN_TRANSIT', '접수', '접수'],
      ['IN_TRANSIT', '출고', '로 물품을 보냈'],
      ['IN_TRANSIT', '입고', '도착'],
      ['IN_TRANSIT', '배달 준비중', '배달 준비중'],
      ['DELIVERED', '배달 완료', '배달 완료'],
    ]

    for (const item of textStatusMappingList) {
      if (description.includes(item[2])) {
        return { code: item[0], name: item[1] }
      }
    }

    return { code: 'UNKNOWN', name: null }
  }
}
