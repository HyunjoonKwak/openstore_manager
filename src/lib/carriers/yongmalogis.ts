import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

interface YongmaSelectDmTrc060Response {
  ymd: string
  code: string
  seqnum: number
}

interface YongmaSelectDmTrc060StatusResponseItem {
  state: string
  ymd: string
  sendstatus: string | null
}

export class YongmaLogisScraper extends CarrierScraper {
  readonly carrierId = 'YONGMALOGIS'
  readonly carrierName = '용마로지스'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const selectDmTrc060QueryString = new URLSearchParams({
        ymd: '',
        conscd: '',
        seq: '',
        ordno: trackingNumber,
      }).toString()

      const selectDmTrc060Response = await fetch(
        `https://eis.yongmalogis.co.kr/dm/dmtrc060/selectDmTrc060?${selectDmTrc060QueryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const selectDmTrc060Text = await selectDmTrc060Response.text()

      if (selectDmTrc060Text === '') {
        return this.createErrorResult(trackingNumber, '현재 접수번호에 대한 정보를 찾지 못했습니다')
      }

      const selectDmTrc060Data: YongmaSelectDmTrc060Response = JSON.parse(selectDmTrc060Text)

      const selectDmTrc060StatusQueryString = new URLSearchParams({
        ymd: selectDmTrc060Data.ymd,
        conscd: selectDmTrc060Data.code,
        seq: selectDmTrc060Data.seqnum.toString(),
      }).toString()

      const selectDmTrc060StatusResponse = await fetch(
        `https://eis.yongmalogis.co.kr/dm/dmtrc060/selectDmTrc060Status?${selectDmTrc060StatusQueryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const selectDmTrc060StatusData: YongmaSelectDmTrc060StatusResponseItem[] = await selectDmTrc060StatusResponse.json()

      const events: TrackEvent[] = []
      for (const event of selectDmTrc060StatusData) {
        events.unshift(
          this.createEvent(
            this.parseStatusCode(event.state),
            event.state,
            this.parseYongmaDateTime(event.ymd),
            null,
            event.sendstatus
          )
        )
      }

      return this.createSuccessResult(trackingNumber, events)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseYongmaDateTime(time: string): string | null {
    try {
      const polishedTime = time.replace(' :', '')
      const [year, month, day] = polishedTime.split('-').map(Number)
      const dateTime = new Date(year, month - 1, day)
      return dateTime.toISOString()
    } catch {
      return null
    }
  }

  private parseStatusCode(stateText: string): TrackEventStatusCode {
    switch (stateText) {
      case '인수':
        return 'AT_PICKUP'
      case 'Hub도착':
      case '배송DC':
        return 'IN_TRANSIT'
      case '배송중':
        return 'OUT_FOR_DELIVERY'
      case '배송완료':
        return 'DELIVERED'
      default:
        return 'UNKNOWN'
    }
  }
}
