import * as cheerio from 'cheerio'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export class ChunilpsScraper extends CarrierScraper {
  readonly carrierId = 'CHUNILPS'
  readonly carrierName = '천일택배'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const queryString = new URLSearchParams({
        transNo: trackingNumber,
      }).toString()

      const response = await fetch(
        `http://www.chunil.co.kr/HTrace/HTrace.jsp?${queryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const html = await response.text()
      const $ = cheerio.load(html)
      const tables = $('table[cellspacing="1"]')

      if (tables.length === 0) {
        return this.createErrorResult(
          trackingNumber,
          '운송장이 등록되지 않았거나 업체에서 상품을 준비중이니 업체로 문의해주시기 바랍니다.'
        )
      }

      const senderElements = tables.eq(0).find('td:nth-child(2n)')
      const recipientElements = tables.eq(1).find('td:nth-child(2n)')
      const eventElements = tables.eq(4).find('tr:not(:first-child)')

      const events: TrackEvent[] = []
      eventElements.each((_, tr) => {
        const tds = $(tr).find('td')
        if (tds.length >= 4) {
          const time = tds.eq(0).text().trim()
          const location = tds.eq(1).text().trim()
          const statusText = tds.eq(3).text().trim()
          const statusCode = this.parseStatusCode(statusText)

          events.push(
            this.createEvent(
              statusCode,
              statusText,
              this.parseDateTime(time, null, 'iso'),
              location,
              `${statusText} - ${location}`
            )
          )
        }
      })

      const senderName = senderElements.eq(0).text().trim() || null
      const recipientName = recipientElements.eq(0).text().trim() || null

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
      case '접수':
        return 'INFORMATION_RECEIVED'
      case '발송':
        return 'AT_PICKUP'
      case '간선상차':
      case '간선하차':
      case '중계도착':
      case '중계발송':
      case '발송터미널하차':
      case '발송터미널출발':
      case '도착터미널하차':
      case '영업소도착':
      case '도착':
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
