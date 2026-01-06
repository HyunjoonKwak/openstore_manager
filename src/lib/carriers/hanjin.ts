import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export class HanjinScraper extends CarrierScraper {
  readonly carrierId = 'HANJIN'
  readonly carrierName = '한진택배'

  async track(trackingNumber: string): Promise<TrackInfo> {
    if (!/^[0-9]+$/.test(trackingNumber)) {
      return this.createErrorResult(trackingNumber, '잘못된 운송장번호입니다.')
    }

    if (trackingNumber.length !== 12 && trackingNumber.length !== 14) {
      return this.createErrorResult(trackingNumber, '운송장번호는 12자리 또는 14자리입니다.')
    }

    try {
      const response = await fetch(
        'https://www.hanjin.com/kor/CMS/DeliveryMgr/WaybillResult.do',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: new URLSearchParams({
            wblnum: trackingNumber,
            mCode: 'MN038',
            schLang: 'KR',
          }).toString(),
        }
      )

      if (response.status === 403) {
        return this.createErrorResult(trackingNumber, '한진택배 서버 접근이 거부되었습니다.')
      }

      const html = await response.text()

      if (html.length < 2000 && html.includes('운송장이 등록되지 않')) {
        return this.createErrorResult(trackingNumber, '운송장이 등록되지 않았습니다.')
      }

      const $ = cheerio.load(html)

      const comm = $('.comm-sec')
      if (comm.length > 0) {
        const message = comm.text().trim()
        if (message.includes('운송장이 등록되지 않')) {
          return this.createErrorResult(trackingNumber, message)
        }
        if (message.includes('잘못된 운송장')) {
          return this.createErrorResult(trackingNumber, message)
        }
      }

      const tables = $('table')
      if (tables.length < 2) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const infoRows = tables.eq(0).find('tr')
      const infoTds = infoRows.eq(1).find('td')
      
      const productName = infoTds.eq(0).text().trim() || null
      const senderName = infoTds.eq(1).text().trim() || null
      const recipientName = infoTds.eq(2).text().trim() || null
      const recipientAddress = infoTds.eq(3).text().trim() || null

      const eventTrs = tables.eq(1).find('tr')
      const events: TrackEvent[] = []

      eventTrs.each((index) => {
        const $tr = eventTrs.eq(index)
        const event = this.parseEvent($tr)
        if (event) {
          events.push(event)
        }
      })

      return this.createSuccessResult(
        trackingNumber,
        events,
        { name: senderName },
        { name: recipientName, address: recipientAddress },
        productName
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseEvent($tr: cheerio.Cheerio<Element>): TrackEvent | null {
    const tds = $tr.find('td')
    if (tds.length < 4) return null

    const dateStr = tds.eq(0).text().replace(/\s+/g, ' ').trim()
    const timeStr = tds.eq(1).text().replace(/\s+/g, ' ').trim()
    const location = tds.eq(2).text().replace(/\s+/g, ' ').trim()
    const description = tds.eq(3).text().replace(/\s+/g, ' ').trim()

    const time = this.parseDateTime(dateStr, timeStr, 'korean')
    const statusCode = this.parseStatusCode(description)

    return this.createEvent(
      statusCode,
      this.getStatusName(statusCode),
      time,
      location,
      description
    )
  }

  private parseStatusCode(description: string): TrackEventStatusCode {
    if (description.includes('접수')) return 'INFORMATION_RECEIVED'
    if (description.includes('운송장 정보가 등록')) return 'INFORMATION_RECEIVED'
    if (description.includes('집하')) return 'AT_PICKUP'
    if (description.includes('로 이동중')) return 'IN_TRANSIT'
    if (description.includes('에 도착')) return 'IN_TRANSIT'
    if (description.includes('에 입고')) return 'IN_TRANSIT'
    if (description.includes('배송을 준비중')) return 'IN_TRANSIT'
    if (description.includes('배송준비중')) return 'IN_TRANSIT'
    if (description.includes('배송출발')) return 'OUT_FOR_DELIVERY'
    if (description.includes('배송완료')) return 'DELIVERED'
    if (description.includes('통관')) return 'IN_TRANSIT'
    if (description.includes('항공편')) return 'IN_TRANSIT'
    if (description.includes('선편')) return 'IN_TRANSIT'
    if (description.includes('수입신고')) return 'IN_TRANSIT'
    if (description.includes('관부가세')) return 'EXCEPTION'

    return 'UNKNOWN'
  }

  private getStatusName(code: TrackEventStatusCode): string {
    switch (code) {
      case 'INFORMATION_RECEIVED': return '접수'
      case 'AT_PICKUP': return '집하'
      case 'IN_TRANSIT': return '이동중'
      case 'OUT_FOR_DELIVERY': return '배송출발'
      case 'DELIVERED': return '배송완료'
      case 'ATTEMPT_FAIL': return '배송실패'
      case 'EXCEPTION': return '이상'
      default: return '알 수 없음'
    }
  }
}
