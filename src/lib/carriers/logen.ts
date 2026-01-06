import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export class LogenScraper extends CarrierScraper {
  readonly carrierId = 'LOGEN'
  readonly carrierName = '로젠택배'

  async track(trackingNumber: string): Promise<TrackInfo> {
    if (!/^\d+$/.test(trackingNumber)) {
      return this.createErrorResult(trackingNumber, '운송장 번호는 숫자로만 이루어져야 합니다.')
    }

    try {
      const response = await fetch(
        `https://www.ilogen.com/web/personal/trace/${encodeURIComponent(trackingNumber)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const html = await response.text()

      if (html.includes("alert('잘못된 접근입니다. 운송장번호를 확인해주세요.')")) {
        return this.createErrorResult(trackingNumber, '잘못된 운송장번호입니다.')
      }

      const $ = cheerio.load(html)

      const empty = $('tr.empty')
      if (empty.length > 0) {
        const message = empty.text().trim()
        return this.createErrorResult(trackingNumber, message || '배송 정보를 찾을 수 없습니다.')
      }

      const table = $('table.data')
      if (table.length === 0) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const { sender, recipient, productName } = this.parseProductInfo($)

      const eventTrs = table.find('tbody > tr')
      const events: TrackEvent[] = []

      eventTrs.each((index) => {
        const $tr = eventTrs.eq(index)
        const event = this.parseEvent($tr)
        if (event) {
          events.push(event)
        }
      })

      return this.createSuccessResult(trackingNumber, events, sender, recipient, productName)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseProductInfo($: cheerio.CheerioAPI): {
    sender: { name: string | null; address?: string | null } | null
    recipient: { name: string | null; address?: string | null } | null
    productName: string | null
  } {
    let senderName: string | null = null
    let recipientName: string | null = null
    let productName: string | null = null
    let address: string | null = null

    $('table.horizon.pdInfo tbody tr').each((_, tr) => {
      const $tr = $(tr)
      $tr.find('td.tit').each((_, td) => {
        const $td = $(td)
        const label = $td.text().trim()
        const $valueCell = $td.next('td')
        const value = $valueCell.text().trim()

        if (label === '보내시는 분' && value) {
          senderName = value
        }
        if (label === '받으시는 분' && value) {
          recipientName = value
        }
        if (label === '상품명' && value) {
          productName = value
        }
        if (label === '주소') {
          const colspan = $valueCell.attr('colspan')
          if (colspan) {
            address = value
          } else if (value) {
            address = value
          }
        }
      })
    })

    return {
      sender: senderName ? { name: senderName } : null,
      recipient: recipientName ? { name: recipientName, address } : null,
      productName,
    }
  }

  private parseEvent($tr: cheerio.Cheerio<Element>): TrackEvent | null {
    const tds = $tr.find('td')
    if (tds.length < 4) return null

    const timeStr = tds.eq(0).text().replace(/\s+/g, ' ').trim()
    const location = tds.eq(1).text().replace(/\s+/g, ' ').trim()
    let status = tds.eq(2).text().replace(/\s+/g, ' ').trim()
    const description = tds.eq(3).text().replace(/\s+/g, ' ').trim()

    if (status === '배송완료 사진확인') {
      status = '배송완료'
    }

    const statusCode = this.parseStatusCode(status)

    return this.createEvent(
      statusCode,
      status,
      this.parseDateTime(timeStr, null, 'korean-dot'),
      location,
      description
    )
  }

  private parseStatusCode(status: string): TrackEventStatusCode {
    switch (status) {
      case '터미널입고':
      case '터미널출고':
      case '집하출고':
      case '집하완료':
      case '행낭적입':
      case '배송입고':
        return 'IN_TRANSIT'
      case '배송출고':
        return 'OUT_FOR_DELIVERY'
      case '배송완료':
        return 'DELIVERED'
      default:
        return 'UNKNOWN'
    }
  }
}
