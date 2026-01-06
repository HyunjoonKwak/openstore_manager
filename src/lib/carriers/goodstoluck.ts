import * as cheerio from 'cheerio'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export class GoodsToLuckScraper extends CarrierScraper {
  readonly carrierId = 'GOODSTOLUCK'
  readonly carrierName = '굿투럭'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const response = await fetch(
        'http://www.goodstoluck.co.kr/tracking/tracking_proc.php',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: new URLSearchParams({
            RetrieveFlag: 'SEARCH',
            Txt_word: trackingNumber,
          }).toString(),
        }
      )

      const html = await response.text()
      const $ = cheerio.load(html)

      const notFound = $('table.result_none_tb')
      if (notFound.length > 0) {
        const message = notFound.text().replace(/\s+/g, ' ').trim()
        return this.createErrorResult(trackingNumber, message || '배송 정보를 찾을 수 없습니다.')
      }

      const tables = $('table')
      if (tables.length < 2) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const info = tables.eq(0).find('tr:nth-child(2) > td')
      const eventTrs = tables.eq(1).find('tr:not(:first-child)')

      const events: TrackEvent[] = []
      eventTrs.each((_, tr) => {
        const tds = $(tr).find('td')
        const time = tds.eq(0).text().replace(/\s+/g, ' ').trim()
        const location = tds.eq(1).text().replace(/\s+/g, ' ').trim()
        const statusText = tds.eq(3).text().replace(/\s+/g, ' ').trim()

        const statusCode = this.parseStatusCode(statusText)
        events.push(
          this.createEvent(
            statusCode,
            statusText,
            this.parseDateTime(time, null, 'korean'),
            location,
            `${statusText} - ${location}`
          )
        )
      })

      const senderName = info.eq(1).text().replace(/\s+/g, ' ').trim() || null
      const recipientName = info.eq(2).text().replace(/\s+/g, ' ').trim() || null

      return this.createSuccessResult(
        trackingNumber,
        events,
        senderName ? { name: senderName } : null,
        recipientName ? { name: recipientName } : null
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseStatusCode(status: string | null): TrackEventStatusCode {
    switch (status) {
      case '간선하차':
      case '간선상차':
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
