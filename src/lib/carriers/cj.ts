import * as cheerio from 'cheerio'
import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

interface CJTrackingDetail {
  parcelResultMap: {
    resultList: Array<{
      sendrNm: string
      rcvrNm: string
      itemNm: string
    }>
  }
  parcelDetailResultMap: {
    resultList: Array<{
      dTime: string
      regBranNm: string
      scanNm: string
      crgNm: string
      crgSt: string
    }>
  }
}

export class CJScraper extends CarrierScraper {
  readonly carrierId = 'CJ'
  readonly carrierName = 'CJ대한통운'

  async track(trackingNumber: string): Promise<TrackInfo> {
    if (!/^(\d{10}|\d{12})$/.test(trackingNumber)) {
      return this.createErrorResult(trackingNumber, '운송장 번호는 10자리 또는 12자리입니다.')
    }

    try {
      const mainPageResponse = await fetch(
        'https://www.cjlogistics.com/ko/tool/parcel/tracking',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        }
      )

      const cookies = mainPageResponse.headers.get('set-cookie') || ''
      const mainPageHtml = await mainPageResponse.text()
      const $ = cheerio.load(mainPageHtml)
      const csrf = $('input[name=_csrf]').val() as string

      if (!csrf) {
        return this.createErrorResult(trackingNumber, 'CSRF 토큰을 가져올 수 없습니다.')
      }

      const queryString = new URLSearchParams({
        paramInvcNo: trackingNumber,
        _csrf: csrf,
      }).toString()

      const trackingResponse = await fetch(
        `https://www.cjlogistics.com/ko/tool/parcel/tracking-detail?${queryString}`,
        {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookies,
          },
        }
      )

      const data: CJTrackingDetail = await trackingResponse.json()

      const parcelResult = data.parcelResultMap?.resultList?.[0] ?? null
      const detailResults = data.parcelDetailResultMap?.resultList ?? []

      if (!parcelResult && detailResults.length === 0) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const events: TrackEvent[] = detailResults.map((detail) => {
        const statusCode = this.parseStatusCode(detail.crgSt)
        return this.createEvent(
          statusCode,
          detail.scanNm,
          this.parseDateTime(detail.dTime, null, 'iso'),
          detail.regBranNm,
          detail.crgNm
        )
      })

      return this.createSuccessResult(
        trackingNumber,
        events,
        parcelResult ? { name: parcelResult.sendrNm } : null,
        parcelResult ? { name: parcelResult.rcvrNm } : null,
        parcelResult?.itemNm || null
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseStatusCode(crgSt: string): TrackEventStatusCode {
    switch (crgSt) {
      case '11': return 'AT_PICKUP'
      case '21':
      case '41':
      case '42':
      case '44': return 'IN_TRANSIT'
      case '82': return 'OUT_FOR_DELIVERY'
      case '91': return 'DELIVERED'
      default: return 'UNKNOWN'
    }
  }
}
