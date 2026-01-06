import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

interface LotteTrackingResponse {
  errorCd: string
  tracking: Array<{
    SCAN_YMD: string
    SCAN_TME: string
    BRNSHP_NM: string
    PTN_BRNSHP_NM: string
    STATUS: string
    GODS_STAT_CD: string
    GODS_STAT_NM: string
  }>
  user?: {
    NM1: string
    NM2: string
    ITEM_NM: string
    AD1: string
    AD2: string
    TEL1?: string
    TEL2?: string
  }
}

export class LotteScraper extends CarrierScraper {
  readonly carrierId = 'LOTTE'
  readonly carrierName = '롯데택배'

  async track(trackingNumber: string): Promise<TrackInfo> {
    if (trackingNumber.length !== 12) {
      return this.createErrorResult(trackingNumber, '운송장번호는 12자리입니다.')
    }

    if (!/^\d+$/.test(trackingNumber)) {
      return this.createErrorResult(trackingNumber, '운송장번호는 숫자로만 이루어져야 합니다.')
    }

    const checksum = Number(trackingNumber.substring(11, 12))
    if (Number(trackingNumber.substring(0, 11)) % 7 !== checksum) {
      return this.createErrorResult(trackingNumber, '잘못된 운송장번호입니다.')
    }

    try {
      const queryString = new URLSearchParams({
        invNo: trackingNumber,
      }).toString()

      const response = await fetch(
        `https://ftr.alps.llogis.com:18260/openapi/ftr/getCustomerInvTracking?${queryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const data: LotteTrackingResponse = await response.json()

      if (data.errorCd === '0' && (!data.tracking || data.tracking.length === 0)) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const events: TrackEvent[] = data.tracking.map((item) => {
        const statusCode = this.parseStatusCode(item.GODS_STAT_CD)
        let time = item.SCAN_TME
        if (time === '------') {
          time = '235959'
        }

        return this.createEvent(
          statusCode,
          item.GODS_STAT_NM,
          this.parseDateTime(item.SCAN_YMD, time, 'compact'),
          item.BRNSHP_NM,
          `${item.PTN_BRNSHP_NM} - ${item.STATUS}`
        )
      })

      const inferredDelivered = this.inferDeliveredEvent(events)
      if (inferredDelivered) {
        events.push(inferredDelivered)
      }

      const sender = data.user?.NM1 ? { name: data.user.NM1, address: data.user.AD1 || null } : null
      const recipient = data.user?.NM2 ? { name: data.user.NM2, address: data.user.AD2 || null } : null
      const productName = data.user?.ITEM_NM || null

      return this.createSuccessResult(trackingNumber, events, sender, recipient, productName)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseStatusCode(statCd: string): TrackEventStatusCode {
    switch (statCd) {
      case '09': return 'EXCEPTION'
      case '10': return 'AT_PICKUP'
      case '12': return 'INFORMATION_RECEIVED'
      case '20':
      case '21':
      case '24':
      case '25': return 'IN_TRANSIT'
      case '40': return 'OUT_FOR_DELIVERY'
      case '41': return 'DELIVERED'
      case '42':
      case '45': return 'DELIVERED'
      default: return 'UNKNOWN'
    }
  }

  private inferDeliveredEvent(events: TrackEvent[]): TrackEvent | null {
    let recipientRegisteredEvent: TrackEvent | null = null

    for (const event of events) {
      if (event.status.code === 'DELIVERED') {
        return null
      }
      if (event.status.name === '인수자등록') {
        recipientRegisteredEvent = event
      }
    }

    if (!recipientRegisteredEvent) {
      return null
    }

    return this.createEvent(
      'DELIVERED',
      '배달 완료',
      recipientRegisteredEvent.time,
      recipientRegisteredEvent.location,
      '배달 완료 (인수자등록)'
    )
  }
}
