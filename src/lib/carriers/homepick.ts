import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

interface HomepickUniversalInquiryResponse {
  success: boolean
  message?: string
  data?: string
}

interface HomepickDeliveryResponse {
  data: {
    delivery: {
      orderStatusHistoryList: Array<{
        trackingStatus: string
        tmsStatusName: string | null
        trackingStatusName: string | null
        statusDateTime: string
        location: string | null
        contents: string | null
      }>
    }
  }
}

export class HomepickScraper extends CarrierScraper {
  readonly carrierId = 'HOMEPICK'
  readonly carrierName = '홈픽'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const queryString = new URLSearchParams({
        keyword: trackingNumber,
      }).toString()

      const universalInquiryResponse = await fetch(
        `https://www.homepick.com/user/api/delivery/universalInquiry?${queryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const universalInquiryData: HomepickUniversalInquiryResponse = await universalInquiryResponse.json()

      if (!universalInquiryData.success) {
        return this.createErrorResult(trackingNumber, universalInquiryData.message || '배송 정보를 찾을 수 없습니다.')
      }

      const orderBoxId = universalInquiryData.data
      const deliveryResponse = await fetch(
        `https://www.homepick.com/user/api/delivery/${orderBoxId}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const deliveryData: HomepickDeliveryResponse = await deliveryResponse.json()

      const events: TrackEvent[] = []
      for (const event of deliveryData.data.delivery.orderStatusHistoryList) {
        events.unshift(
          this.createEvent(
            this.parseStatusCode(event.trackingStatus),
            event.tmsStatusName || event.trackingStatusName,
            this.parseDateTime(event.statusDateTime, null, 'iso'),
            event.location,
            event.contents
          )
        )
      }

      return this.createSuccessResult(trackingNumber, events)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseStatusCode(status: string | null): TrackEventStatusCode {
    switch (status) {
      case 'RECEIVED':
        return 'INFORMATION_RECEIVED'
      case 'TERMINAL_IN':
      case 'MOVING':
        return 'IN_TRANSIT'
      case 'DLV_START':
        return 'OUT_FOR_DELIVERY'
      case 'COMPLETED':
        return 'DELIVERED'
      default:
        return 'UNKNOWN'
    }
  }
}
