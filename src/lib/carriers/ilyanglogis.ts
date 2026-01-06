import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

interface IlyangLogisResponse {
  resultAPI: {
    head: {
      returnCode: string
      returnDesc: string
    }
    body?: {
      resultList?: Array<{
        lastTrackingDesc?: string
        resultDesc?: string
        tracking?: Array<{
          chkPointDesc: string
          actDate: string
          actTime: string
          stationName: string
        }>
      }>
    }
  }
}

export class IlyangLogisScraper extends CarrierScraper {
  readonly carrierId = 'ILYANGLOGIS'
  readonly carrierName = '일양로지스'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const response = await fetch(
        'https://www.ilyanglogis.co.kr/include/getAPIResult.asp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: new URLSearchParams({
            req_type: 'TRACKING',
            tracking_type: '0',
            blNum: trackingNumber,
          }).toString(),
        }
      )

      const data: IlyangLogisResponse = await response.json()

      if (data.resultAPI.head.returnCode !== 'R0') {
        return this.createErrorResult(
          trackingNumber,
          `[일양로지스 내부 에러] ${data.resultAPI.head.returnDesc}`
        )
      }

      const result = data.resultAPI.body?.resultList?.[0]
      if (!result) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      if (!result.tracking) {
        const message = result.lastTrackingDesc || result.resultDesc || '배송 정보를 찾을 수 없습니다.'
        return this.createErrorResult(trackingNumber, message)
      }

      const events: TrackEvent[] = result.tracking.map((item) => {
        const statusCode = this.parseStatusCode(item.chkPointDesc)
        const time = this.parseCompactDateTime(item.actDate, item.actTime)
        return this.createEvent(
          statusCode,
          item.chkPointDesc,
          time,
          item.stationName,
          `${item.chkPointDesc} - ${item.stationName}`
        )
      })

      return this.createSuccessResult(trackingNumber, events)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseCompactDateTime(date: string, time: string): string | null {
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

  private parseStatusCode(status: string | null): TrackEventStatusCode {
    switch (status) {
      case '발송사무소 인수':
        return 'AT_PICKUP'
      case '배송경유지 출고':
      case '배송경유지 도착':
        return 'IN_TRANSIT'
      case '직원 배송중':
        return 'OUT_FOR_DELIVERY'
      case '배달완료':
        return 'DELIVERED'
      default:
        return 'UNKNOWN'
    }
  }
}
