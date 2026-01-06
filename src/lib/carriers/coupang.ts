import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export class CoupangScraper extends CarrierScraper {
  readonly carrierId = 'COUPANG'
  readonly carrierName = '쿠팡 로켓배송'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const response = await fetch(
        `https://www.coupangls.com/web/modal/invoice/${encodeURIComponent(trackingNumber)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const html = await response.text()
      const $ = cheerio.load(html)

      const eventTrs = $('.tracking-detail > table > tbody > tr')

      if (eventTrs.length === 0) {
        const message = $('.modal-body').text().replace(/\s+/g, ' ').trim()
        if (message.includes('운송장 미등록') || message.includes('waybill is not registered')) {
          return this.createErrorResult(trackingNumber, message)
        }
        return this.createErrorResult(trackingNumber, message || '배송 정보를 찾을 수 없습니다.')
      }

      const events: TrackEvent[] = []
      eventTrs.each((index) => {
        const $tr = eventTrs.eq(index)
        const event = this.parseEvent($tr)
        if (event) events.push(event)
      })

      const recipientName = $('.recipient > div').text().replace(/ 님$/, '') || null

      return this.createSuccessResult(
        trackingNumber,
        events,
        null,
        recipientName ? { name: recipientName } : null
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseEvent($tr: cheerio.Cheerio<Element>): TrackEvent | null {
    const tds = $tr.find('td')
    if (tds.length < 3) return null

    const timeStr = tds.eq(0).text().replace(/\s+/g, ' ').trim()
    const location = tds.eq(1).text().replace(/\s+/g, ' ').trim()
    const status = tds.eq(2).text().replace(/\s+/g, ' ').trim()

    const statusCode = this.parseStatusCode(status)

    return this.createEvent(
      statusCode,
      status,
      this.parseDateTime(timeStr, null, 'iso'),
      null,
      `${status} - ${location}`
    )
  }

  private parseStatusCode(status: string): TrackEventStatusCode {
    switch (status) {
      case '운송장 등록': return 'INFORMATION_RECEIVED'
      case '집하':
      case '택배접수':
      case '센터상차':
      case '센터도착':
      case '캠프상차':
      case '캠프도착':
      case '소터분류':
      case '통관시작':
      case '통관완료':
      case '공항출발':
      case '공항도착':
      case '항공기 출발':
      case '항공기 도착': return 'IN_TRANSIT'
      case '배송출발': return 'OUT_FOR_DELIVERY'
      case '배송완료': return 'DELIVERED'
      default: return 'UNKNOWN'
    }
  }
}
