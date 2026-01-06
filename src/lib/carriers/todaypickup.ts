import * as cheerio from 'cheerio'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export class TodayPickupScraper extends CarrierScraper {
  readonly carrierId = 'TODAYPICKUP'
  readonly carrierName = '오늘의픽업'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const response = await fetch(
        `https://mall.todaypickup.com/front/delivery/list/${encodeURIComponent(trackingNumber)}`,
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

      const infoTds = tables.eq(1).find('tbody > tr > td')
      if ((infoTds.eq(0).text().replace(/\s+/g, ' ').trim() || '') === '') {
        const message = infoTds.eq(1).text().replace(/\s+/g, ' ').trim()
        if (message.includes('정보가 없')) {
          return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
        }
        return this.createErrorResult(trackingNumber, message || '배송 정보를 찾을 수 없습니다.')
      }

      const eventTrs = tables.eq(2).find('tbody > tr')
      const events: TrackEvent[] = []
      eventTrs.each((_, tr) => {
        const tds = $(tr).find('td')
        const time = tds.eq(0).text().replace(/\s+/g, ' ').trim()
        const location = tds.eq(1).text().replace(/\s+/g, ' ').trim()
        const description = tds.eq(2).text().replace(/\s+/g, ' ').trim()

        const statusInfo = this.parseStatus(description)
        events.push(
          this.createEvent(
            statusInfo.code,
            statusInfo.name,
            this.parseTodayPickupDateTime(time),
            location,
            description
          )
        )
      })

      return this.createSuccessResult(trackingNumber, events)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseTodayPickupDateTime(time: string): string | null {
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

  private parseStatus(description: string | null): { code: TrackEventStatusCode; name: string | null } {
    if (!description) {
      return { code: 'UNKNOWN', name: null }
    }

    if (description.includes('접수')) {
      return { code: 'INFORMATION_RECEIVED', name: '상품 접수' }
    }
    if (description.includes('수거')) {
      return { code: 'AT_PICKUP', name: '상품 수거' }
    }
    if (description.includes('거점에 입고')) {
      return { code: 'IN_TRANSIT', name: '거점 입고' }
    }
    if (description.includes('배송 중')) {
      return { code: 'OUT_FOR_DELIVERY', name: '배송 중' }
    }
    if (description.includes('도착')) {
      return { code: 'DELIVERED', name: '배송완료' }
    }

    return { code: 'UNKNOWN', name: null }
  }
}
