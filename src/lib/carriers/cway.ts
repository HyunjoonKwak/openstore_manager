import { CarrierScraper } from './base'
import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

interface CwayDetailResponse {
  code: number
  data: {
    receiver: string
  } | null
}

interface CwayLogListResponse {
  rows: Array<{
    logStatus: string
    logTime: string
    logDetail: string
  }>
}

export class CwayScraper extends CarrierScraper {
  readonly carrierId = 'CWAY'
  readonly carrierName = '합동택배'

  async track(trackingNumber: string): Promise<TrackInfo> {
    try {
      const detailResponse = await fetch('http://cway.hagoto.com/where/details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: new URLSearchParams({
          hblNo: trackingNumber,
        }).toString(),
      })

      const detailData: CwayDetailResponse = await detailResponse.json()

      if (detailData.code === 500 || !detailData.data) {
        return this.createErrorResult(trackingNumber, '배송 정보를 찾을 수 없습니다.')
      }

      const logListResponse = await fetch('http://cway.hagoto.com/where/hbl/logList', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        body: new URLSearchParams({
          hblNo: trackingNumber,
          pageNum: 'NaN',
          isAsc: 'asc',
        }).toString(),
      })

      const logListData: CwayLogListResponse = await logListResponse.json()

      const events: TrackEvent[] = logListData.rows.map((log) => {
        const statusCode = this.parseStatusCode(log.logStatus)
        const location = log.logDetail.split(' ')[0] || null
        return this.createEvent(
          statusCode,
          log.logStatus,
          this.parseDateTime(log.logTime, null, 'korean'),
          location,
          log.logDetail
        )
      })

      return this.createSuccessResult(
        trackingNumber,
        events,
        null,
        detailData.data.receiver ? { name: detailData.data.receiver } : null
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      return this.createErrorResult(trackingNumber, message)
    }
  }

  private parseStatusCode(status: string): TrackEventStatusCode {
    switch (status) {
      case '집하':
      case '선적':
      case '세관지정 장치장 반입':
      case '수입통관 진행중':
      case '세관지정 장치장 반출':
      case '수입통관 완료':
      case '집화처리':
      case '간선하차':
      case '간선상차':
        return 'IN_TRANSIT'
      case '배달출발':
        return 'OUT_FOR_DELIVERY'
      case '배달완료':
        return 'DELIVERED'
      default:
        return 'UNKNOWN'
    }
  }
}
