import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export class EpostScraper extends CarrierScraper {
  readonly carrierId = 'EPOST'
  readonly carrierName = '우체국택배'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const queryString = new URLSearchParams({
        sid1: trackingNumber,
      }).toString()

      const response = await fetch(
        `https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm?${queryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const html = await response.text()
      const $ = cheerio.load(html)

      const eventTrs = $('#processTable > tbody > tr')
      if (eventTrs.length < 1) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const events: TrackEvent[] = []
      eventTrs.each((index) => {
        const $tr = eventTrs.eq(index)
        const event = this.parseEvent($tr)
        if (event) {
          events.push(event)
        }
      })

      const senderAndRecipient = this.parseSenderAndRecipient($)

      return this.createSuccessResult(
        trackingNumber,
        events,
        senderAndRecipient.sender,
        senderAndRecipient.recipient
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseEvent($tr: cheerio.Cheerio<Element>): TrackEvent | null {
    const tds = $tr.find('td')
    if (tds.length < 4) return null

    const date = tds.eq(0).text().replace(/\s+/g, ' ').trim()
    const time = tds.eq(1).text().replace(/\s+/g, ' ').trim()
    const location = tds.eq(2).text().replace(/\s+/g, ' ').trim()
    let status = tds.eq(3).text().replace(/\s+/g, ' ').trim()

    if (status.startsWith('접수 소포 물품 사진')) {
      status = '접수'
    }

    const statusCode = this.parseStatusCode(status)

    return this.createEvent(
      statusCode,
      status,
      this.parseDateTime(date, time, 'korean-dot'),
      location,
      `${status} - ${location}`
    )
  }

  private parseStatusCode(status: string): TrackEventStatusCode {
    if (status === '운송장출력' || status === '접수' || status.includes('접수')) {
      return 'INFORMATION_RECEIVED'
    }
    if (status === '발송' || status === '도착') {
      return 'IN_TRANSIT'
    }
    if (status.includes('집하완료')) {
      return 'IN_TRANSIT'
    }
    if (status.includes('배달준비')) {
      return 'OUT_FOR_DELIVERY'
    }
    if (status.includes('배달완료')) {
      return 'DELIVERED'
    }
    if (status.includes('미배달')) {
      return 'ATTEMPT_FAIL'
    }
    if (status.includes('취소')) {
      return 'EXCEPTION'
    }
    if (status.includes('인수완료')) {
      return 'AT_PICKUP'
    }

    return 'UNKNOWN'
  }

  private parseSenderAndRecipient($: cheerio.CheerioAPI): {
    sender: { name: string | null } | null
    recipient: { name: string | null } | null
  } {
    try {
      const tds = $('table.table_col > tbody').find('td')
      
      const senderHtml = tds.eq(0).html() || ''
      const recipientHtml = tds.eq(1).html() || ''

      const senderName = senderHtml.split('<br>')[0]?.trim() || null
      const recipientName = recipientHtml.split('<br>')[0]?.trim() || null

      return {
        sender: senderName ? { name: senderName } : null,
        recipient: recipientName ? { name: recipientName } : null,
      }
    } catch {
      return { sender: null, recipient: null }
    }
  }
}
