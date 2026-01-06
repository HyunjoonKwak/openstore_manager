import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

interface HonamLogisResponse {
  ODS0_TOTAL: number
  ODS0: Array<{
    TRACKING_DTL: Array<{
      SCANGB_NM: string
      SCAN_DM: string
      SCAN_USER_NM: string
    }>
  }>
}

export class HonamLogisScraper extends CarrierScraper {
  readonly carrierId = 'HONAMLOGIS'
  readonly carrierName = '호남물류'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const response = await fetch(
        'http://inkoin.com/tracking_number.php',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: new URLSearchParams({
            SLIP_BARCD: trackingNumber,
          }).toString(),
        }
      )

      const data: HonamLogisResponse = await response.json()

      if (data.ODS0_TOTAL < 1) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const ods = data.ODS0[0]

      const events: TrackEvent[] = ods.TRACKING_DTL.map((item) => {
        const statusCode = this.parseStatusCode(item.SCANGB_NM)
        const time = this.parseCompactDateTime(item.SCAN_DM)
        return this.createEvent(
          statusCode,
          item.SCANGB_NM,
          time,
          item.SCAN_USER_NM,
          item.SCANGB_NM
        )
      })

      return this.createSuccessResult(trackingNumber, events)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseCompactDateTime(time: string | null): string | null {
    if (!time) return null

    try {
      const year = parseInt(time.substring(0, 4))
      const month = parseInt(time.substring(4, 6)) - 1
      const day = parseInt(time.substring(6, 8))
      const hour = parseInt(time.substring(8, 10))
      const minute = parseInt(time.substring(10, 12))
      const second = parseInt(time.substring(12, 14))

      const dateTime = new Date(year, month, day, hour, minute, second)
      return dateTime.toISOString()
    } catch {
      return null
    }
  }

  private parseStatusCode(status: string | null): TrackEventStatusCode {
    switch (status) {
      case '노선상차':
      case '집하입고':
      case '집하상차':
      case 'HUB T/M도착':
      case 'T/M출고':
      case '터미널출고':
      case '터미널입고':
      case '노선하차':
      case '영업소입고':
        return 'IN_TRANSIT'
      case '배송출발':
        return 'OUT_FOR_DELIVERY'
      case '배송완료':
        return 'DELIVERED'
      default:
        return 'UNKNOWN'
    }
  }
}
