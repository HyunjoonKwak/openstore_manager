import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export class DaesinScraper extends CarrierScraper {
  readonly carrierId = 'DAESIN'
  readonly carrierName = '대신택배'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const response = await fetch(
        'https://www.ds3211.co.kr/freight/internalFreightSearch.ht',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          body: new URLSearchParams({
            billno: trackingNumber,
          }).toString(),
        }
      )

      const buffer = await response.arrayBuffer()
      const decoder = new TextDecoder('euc-kr')
      const html = decoder.decode(buffer)

      const $ = cheerio.load(html)
      const printarea = $('#printarea')

      if (printarea.length === 0) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const tables = printarea.find('table')

      if (tables.length === 0) {
        const message = printarea.find('div.effect').text().replace(/\s+/g, ' ').trim()
        if (message.includes('운송된 내역이 없습니다')) {
          return this.createErrorResult(trackingNumber, message)
        }
        return this.createErrorResult(trackingNumber, message || '배송 정보를 찾을 수 없습니다.')
      }

      const infoTds = tables.eq(0).find('td')
      const eventTrs = tables.eq(1).find('tr:not(:first-child)')

      const events: TrackEvent[] = []
      eventTrs.each((index) => {
        const $tr = eventTrs.eq(index)
        const parsedEvents = this.parseEvent($tr)
        events.push(...parsedEvents)
      })

      const senderName = infoTds.eq(0).text().replace(/\s+/g, ' ').trim() || null
      const recipientName = infoTds.eq(2).text().replace(/\s+/g, ' ').trim() || null

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

  private parseEvent($tr: cheerio.Cheerio<Element>): TrackEvent[] {
    const tds = $tr.find('td')

    if (tds.eq(3).attr('colspan') === '2') {
      return []
    }

    const status = tds.eq(0).text().replace(/\s+/g, ' ').trim() || null
    const location = tds.eq(1).text().replace(/\s+/g, ' ').trim() || null
    const enterTime = tds.eq(3).text().replace(/\s+/g, ' ').trim() || null
    const leaveTime = tds.eq(4).text().replace(/\s+/g, ' ').trim() || null
    const currentLocation = tds.eq(5).text().replace(/\s+/g, ' ').trim() || null

    const events: TrackEvent[] = []

    if (enterTime) {
      const statusCode = this.parseStatusCode(status, 'enter', currentLocation)
      events.push(
        this.createEvent(
          statusCode,
          `${status} - 도착`,
          this.parseDateTime(enterTime, null, 'korean'),
          location,
          `${status} - ${location} 도착`
        )
      )

      if (currentLocation === '배달중' || currentLocation === '배송완료') {
        events.push(
          this.createEvent(
            'OUT_FOR_DELIVERY',
            '배달중',
            this.parseDateTime(enterTime, null, 'korean'),
            location,
            `배달중 - ${location}`
          )
        )
      }
    }

    if (leaveTime) {
      const statusCode = this.parseStatusCode(status, 'leave', currentLocation)
      events.push(
        this.createEvent(
          statusCode,
          `${status} - 출발`,
          this.parseDateTime(leaveTime, null, 'korean'),
          location,
          `${status} - ${location} 출발`
        )
      )
    }

    return events
  }

  private parseStatusCode(
    status: string | null,
    eventType: 'enter' | 'leave',
    currentLocation: string | null
  ): TrackEventStatusCode {
    if (currentLocation === '배송완료' && eventType === 'leave') {
      return 'DELIVERED'
    }

    if (status === '발송취급점' && eventType === 'enter') {
      return 'INFORMATION_RECEIVED'
    }

    return 'IN_TRANSIT'
  }
}
