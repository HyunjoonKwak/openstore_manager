import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

interface KdexpResponse {
  result: string
  data?: {
    scanList: Array<{
      scanDt: string
      scanType: string
      scanTypeNm: string
      strtPointNm: string
    }>
  }
}

interface KdexpLegacyResponse {
  result: string
  items?: Array<{
    reg_date: string
    stat: string
    location: string
  }>
}

export class KdexpScraper extends CarrierScraper {
  readonly carrierId = 'KDEXP'
  readonly carrierName = '경동택배'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const queryString = new URLSearchParams({
        barcode: trackingNumber,
      }).toString()

      const response = await fetch(
        `https://kdexp.com/service/delivery/new/ajax_basic.do?${queryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const data: KdexpResponse = await response.json()

      if (data.result !== 'suc' || !data.data) {
        return this.trackLegacy(trackingNumber)
      }

      const events: TrackEvent[] = data.data.scanList.map((item) => {
        const statusCode = this.parseStatusCode(item.scanType)
        return this.createEvent(
          statusCode,
          item.scanTypeNm,
          this.parseDateTime(item.scanDt, null, 'iso'),
          item.strtPointNm,
          `${item.scanTypeNm} - ${item.strtPointNm}`
        )
      })

      return this.createSuccessResult(trackingNumber, events)
    } catch (error) {
      return this.trackLegacy(trackingNumber)
    }
  }

  private async trackLegacy(trackingNumber: string): Promise<TrackInfo> {
    try {
      const queryString = new URLSearchParams({
        barcode: trackingNumber,
      }).toString()

      const response = await fetch(
        `https://kdexp.com/service/delivery/ajax_basic.do?${queryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const data: KdexpLegacyResponse = await response.json()

      if (data.result !== 'suc' || !data.items) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const events: TrackEvent[] = data.items.map((item) => {
        const statusCode = this.parseLegacyStatusCode(item.stat)
        return this.createEvent(
          statusCode,
          item.stat,
          this.parseDateTime(item.reg_date, null, 'iso'),
          item.location,
          `${item.stat} - ${item.location}`
        )
      })

      return this.createSuccessResult(trackingNumber, events)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseStatusCode(scanType: string): TrackEventStatusCode {
    switch (scanType) {
      case '0002': return 'AT_PICKUP'
      case '0003':
      case '0006':
      case '0008': return 'IN_TRANSIT'
      case '0007': return 'DELIVERED'
      default: return 'UNKNOWN'
    }
  }

  private parseLegacyStatusCode(status: string): TrackEventStatusCode {
    switch (status) {
      case '접수완료': return 'INFORMATION_RECEIVED'
      case '영업소집하': return 'AT_PICKUP'
      case '노선상차':
      case '터미널입고':
      case '영업소도착':
      case '배달차량상차': return 'IN_TRANSIT'
      case '배송완료': return 'DELIVERED'
      default: return 'UNKNOWN'
    }
  }
}
