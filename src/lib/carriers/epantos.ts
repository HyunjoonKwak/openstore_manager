import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

interface PantosTrackingListResponse {
  body: {
    list: Array<{
      hblNo: string
      mblNo: string
      expsBizTypeCd: string
    }>
  }
}

interface PantosTrackingListDtlResponse {
  body: Array<{
    evntCd: string
    evntDt2: string
    evntLocNm: string
    evntDesc: string | null
  }>
}

export class PantosScraper extends CarrierScraper {
  readonly carrierId = 'EPANTOS'
  readonly carrierName = '판토스'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const trackingListResponse = await fetch(
        'https://www.epantos.com/eCommerce/action/portal.TrackingPopup.retreiveTrackingList',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: JSON.stringify({ quickNo: trackingNumber, locale: 'ko' }),
        }
      )

      const trackingListData: PantosTrackingListResponse = await trackingListResponse.json()

      if (trackingListData.body.list.length < 1) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const hblInfo = trackingListData.body.list[0]

      const trackingListDtlResponse = await fetch(
        'https://www.epantos.com/eCommerce/action/portal.TrackingPopup.retreiveTrackingListDtl',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: JSON.stringify({
            hblNo: hblInfo.hblNo,
            mblNo: hblInfo.mblNo,
            locale: 'ko',
            expsBizTypeCd: hblInfo.expsBizTypeCd,
          }),
        }
      )

      const trackingListDtlData: PantosTrackingListDtlResponse = await trackingListDtlResponse.json()

      const events: TrackEvent[] = []
      for (const event of trackingListDtlData.body) {
        events.unshift(
          this.createEvent(
            this.parseStatusCode(event.evntCd),
            this.parseStatusName(event.evntCd),
            this.parsePantosDateTime(event.evntDt2),
            null,
            event.evntDesc
          )
        )
      }

      return this.createSuccessResult(trackingNumber, events)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parsePantosDateTime(time: string): string | null {
    try {
      const [datePart, timePart] = time.split(' ')
      const [year, month, day] = datePart.split('.').map(Number)
      const [hour, minute] = timePart.split(':').map(Number)
      const dateTime = new Date(year, month - 1, day, hour, minute)
      return dateTime.toISOString()
    } catch {
      return null
    }
  }

  private parseStatusCode(evntCd: string): TrackEventStatusCode {
    switch (evntCd) {
      case 'DLI':
        return 'DELIVERED'
      case 'FST':
        return 'OUT_FOR_DELIVERY'
      case 'PKU':
        return 'AT_PICKUP'
      case 'DCCC':
      case 'DWHO':
      case 'DWHI':
      case 'ARR':
      case 'DEP':
      case 'LWHO':
      case 'LWHI':
        return 'IN_TRANSIT'
      default:
        return 'UNKNOWN'
    }
  }

  private parseStatusName(evntCd: string): string {
    switch (evntCd) {
      case 'DLI':
        return 'Delivered'
      case 'FST':
        return 'Out for delivery'
      case 'PKU':
        return 'Pick Up'
      case 'DCCC':
      case 'DWHO':
      case 'DWHI':
      case 'ARR':
      case 'DEP':
      case 'LWHO':
      case 'LWHI':
        return 'In Transit'
      default:
        return evntCd
    }
  }
}
