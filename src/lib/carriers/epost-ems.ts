import * as cheerio from 'cheerio'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export class EpostEmsScraper extends CarrierScraper {
  readonly carrierId = 'EPOST_EMS'
  readonly carrierName = '우체국 EMS'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const queryString = new URLSearchParams({
        POST_CODE: trackingNumber,
        displayHeader: 'N',
      }).toString()

      const response = await fetch(
        `https://service.epost.go.kr/trace.RetrieveEmsRigiTraceList.comm?${queryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const html = await response.text()
      const $ = cheerio.load(html)

      const eventTrs = $('table.detail_off > tbody > tr')
      if (eventTrs.length < 1) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const events: TrackEvent[] = []
      eventTrs.each((_, tr) => {
        const tds = $(tr).find('td')
        const time = tds.eq(0).text().replace(/\s+/g, ' ').trim()
        const status = tds.eq(1).text().replace(/\s+/g, ' ').trim()
        const location = tds.eq(2).text().replace(/\s+/g, ' ').trim()
        let description = tds.eq(3).text().replace(/\s+/g, ' ').trim()
        if (!description) {
          description = `${status} - ${location}`
        }

        const statusInfo = this.parseStatus(status)
        events.push(
          this.createEvent(
            statusInfo.code,
            statusInfo.name,
            this.parseEmsDateTime(time),
            location,
            description
          )
        )
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

  private parseEmsDateTime(time: string): string | null {
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

  private parseStatus(status: string | null): { code: TrackEventStatusCode; name: string | null } {
    if (!status) {
      return { code: 'UNKNOWN', name: null }
    }

    switch (status) {
      case '접수':
        return { code: 'INFORMATION_RECEIVED', name: status }
      case '발송준비':
      case '교환국 도착':
      case '발송':
      case '도착':
        return { code: 'IN_TRANSIT', name: status }
    }

    if (status.includes('배달준비')) {
      return { code: 'OUT_FOR_DELIVERY', name: '배달준비' }
    }
    if (status.includes('배달완료')) {
      return { code: 'DELIVERED', name: '배달완료' }
    }

    return { code: 'UNKNOWN', name: status }
  }

  private parseSenderAndRecipient($: cheerio.CheerioAPI): {
    sender: { name: string } | null
    recipient: { name: string } | null
  } {
    try {
      const tds = $('table.table_col > tbody').find('td')

      const senderHtml = tds.eq(0).html() || ''
      const recipientHtml = tds.eq(1).html() || ''

      const senderName = senderHtml.split('<br>')[0].replace(/\s+/g, ' ').trim()
      const recipientName = recipientHtml.split('<br>')[0].replace(/\s+/g, ' ').trim()

      return {
        sender: senderName ? { name: senderName } : null,
        recipient: recipientName ? { name: recipientName } : null,
      }
    } catch {
      return { sender: null, recipient: null }
    }
  }
}
