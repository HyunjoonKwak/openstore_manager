import * as cheerio from 'cheerio'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export class SLXScraper extends CarrierScraper {
  readonly carrierId = 'SLX'
  readonly carrierName = 'SLX'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const queryString = new URLSearchParams({
        iv_no: trackingNumber,
      }).toString()

      const response = await fetch(
        `https://net.slx.co.kr/info/tracking.jsp?${queryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const html = await response.text()
      const $ = cheerio.load(html)

      const tables = $('table')
      if (tables.length < 3) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const eventTrs = tables.eq(2).find('tbody > tr:not(:first-child)')
      if (eventTrs.length === 1 && eventTrs.find('td').first().text() === '') {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const events: TrackEvent[] = []
      eventTrs.each((_, tr) => {
        const tds = $(tr).find('td')
        const status = tds.eq(0).text().replace(/\s+/g, ' ').trim()
        const date = tds.eq(1).text().replace(/\s+/g, ' ').trim()
        const time = tds.eq(2).text().replace(/\s+/g, ' ').trim()
        const location = tds.eq(3).text().replace(/\s+/g, ' ').trim()

        const statusCode = this.parseStatusCode(status)
        events.push(
          this.createEvent(
            statusCode,
            status,
            this.parseSlxDateTime(date, time),
            location,
            `${status} - ${location}`
          )
        )
      })

      return this.createSuccessResult(trackingNumber, events)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseSlxDateTime(date: string, time: string): string | null {
    try {
      const [year, month, day] = date.split('.').map(Number)
      const [hour, minute] = time.split(':').map(Number)
      const dateTime = new Date(year, month - 1, day, hour, minute)
      return dateTime.toISOString()
    } catch {
      return null
    }
  }

  private parseStatusCode(status: string | null): TrackEventStatusCode {
    switch (status) {
      case '상품집하':
        return 'AT_PICKUP'
      case '터미널 입고':
      case '대리점 도착':
        return 'IN_TRANSIT'
      case '미배송':
        return 'ATTEMPT_FAIL'
      case '배송출발':
        return 'OUT_FOR_DELIVERY'
      case '배송완료':
        return 'DELIVERED'
      default:
        return 'UNKNOWN'
    }
  }
}
