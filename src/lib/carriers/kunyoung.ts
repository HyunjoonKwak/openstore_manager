import * as cheerio from 'cheerio'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export class KunyoungScraper extends CarrierScraper {
  readonly carrierId = 'KUNYOUNG'
  readonly carrierName = '건영택배'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const queryString = new URLSearchParams({
        mulno: trackingNumber,
      }).toString()

      const response = await fetch(
        `https://www.kunyoung.com/goods/goods_02.php?${queryString}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const buffer = await response.arrayBuffer()
      const decoder = new TextDecoder('euc-kr')
      const html = decoder.decode(buffer)

      const $ = cheerio.load(html)
      const tables = $('table[width="717"]')

      if (tables.length < 4) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const eventTrs = tables.eq(3).find('tr:nth-child(2n+4)')

      const events: TrackEvent[] = []
      eventTrs.each((_, tr) => {
        const tds = $(tr).find('td')
        const time = tds.eq(0).text().replace(/\s+/g, ' ').trim()
        const status = tds.eq(2).text().replace(/\s+/g, ' ').trim()

        const statusCode = this.parseStatusCode(status)
        events.push(
          this.createEvent(
            statusCode,
            status,
            this.parseDateTime(time, null, 'korean'),
            null,
            status
          )
        )
      })

      if (this.isDummyDataForNotFound(events)) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      return this.createSuccessResult(trackingNumber, events)
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseStatusCode(status: string | null): TrackEventStatusCode {
    if (!status) return 'UNKNOWN'

    if (status.endsWith('배송완료')) {
      return 'DELIVERED'
    }
    if (status.endsWith('발송')) {
      return 'IN_TRANSIT'
    }
    if (status.endsWith('도착')) {
      return 'IN_TRANSIT'
    }

    return 'UNKNOWN'
  }

  private isDummyDataForNotFound(events: TrackEvent[]): boolean {
    if (events.length !== 4) return false

    const dummyPatterns = [
      { time: '2022-11-23T', status: '도착' },
      { time: '2022-11-23T', status: '영덕도착' },
      { time: '2022-12-01T', status: '도착' },
      { time: '2022-12-01T', status: '도착' },
    ]

    return events.every((event, index) => {
      return (
        event.time?.startsWith(dummyPatterns[index].time) &&
        event.status?.name === dummyPatterns[index].status
      )
    })
  }
}
