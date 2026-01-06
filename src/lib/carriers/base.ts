import type { TrackInfo, TrackEvent, TrackEventStatusCode } from './types'

export abstract class CarrierScraper {
  abstract readonly carrierId: string
  abstract readonly carrierName: string

  abstract track(trackingNumber: string): Promise<TrackInfo>

  protected parseDateTime(
    dateStr: string | null,
    timeStr: string | null,
    format: 'iso' | 'korean' | 'korean-dot' | 'compact' = 'korean'
  ): string | null {
    if (!dateStr) return null

    try {
      let dateTime: Date

      switch (format) {
        case 'iso':
          dateTime = new Date(dateStr)
          break
        case 'korean':
          const koreanMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
          if (!koreanMatch) return null
          const timeMatch = timeStr?.match(/(\d{2}):(\d{2})/)
          dateTime = new Date(
            parseInt(koreanMatch[1]),
            parseInt(koreanMatch[2]) - 1,
            parseInt(koreanMatch[3]),
            timeMatch ? parseInt(timeMatch[1]) : 0,
            timeMatch ? parseInt(timeMatch[2]) : 0
          )
          break
        case 'korean-dot':
          const dotMatch = dateStr.match(/(\d{4})\.(\d{2})\.(\d{2})/)
          if (!dotMatch) return null
          const dotTimeMatch = timeStr?.match(/(\d{2}):(\d{2})/)
          dateTime = new Date(
            parseInt(dotMatch[1]),
            parseInt(dotMatch[2]) - 1,
            parseInt(dotMatch[3]),
            dotTimeMatch ? parseInt(dotTimeMatch[1]) : 0,
            dotTimeMatch ? parseInt(dotTimeMatch[2]) : 0
          )
          break
        case 'compact':
          const compactMatch = dateStr.match(/(\d{4})(\d{2})(\d{2})/)
          if (!compactMatch) return null
          const compactTimeMatch = timeStr?.match(/(\d{2})(\d{2})(\d{2})/)
          dateTime = new Date(
            parseInt(compactMatch[1]),
            parseInt(compactMatch[2]) - 1,
            parseInt(compactMatch[3]),
            compactTimeMatch ? parseInt(compactTimeMatch[1]) : 0,
            compactTimeMatch ? parseInt(compactTimeMatch[2]) : 0,
            compactTimeMatch ? parseInt(compactTimeMatch[3]) : 0
          )
          break
        default:
          return null
      }

      return dateTime.toISOString()
    } catch {
      return null
    }
  }

  protected createEvent(
    statusCode: TrackEventStatusCode,
    statusName: string | null,
    time: string | null,
    location: string | null,
    description: string | null
  ): TrackEvent {
    return {
      status: {
        code: statusCode,
        name: statusName,
      },
      time,
      location,
      description,
    }
  }

  protected createSuccessResult(
    trackingNumber: string,
    events: TrackEvent[],
    sender: { name: string | null; address?: string | null } | null = null,
    recipient: { name: string | null; address?: string | null } | null = null,
    productName: string | null = null
  ): TrackInfo {
    return {
      success: true,
      carrier: {
        id: this.carrierId,
        name: this.carrierName,
      },
      trackingNumber,
      sender,
      recipient,
      productName,
      events,
    }
  }

  protected createErrorResult(
    trackingNumber: string,
    error: string
  ): TrackInfo {
    return {
      success: false,
      carrier: {
        id: this.carrierId,
        name: this.carrierName,
      },
      trackingNumber,
      sender: null,
      recipient: null,
      events: [],
      error,
    }
  }
}
