import { NextRequest, NextResponse } from 'next/server'
import { trackHanjinPackage, getTrackingUrl } from '@/lib/logistics/hanjin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { trackingNumber, courierCode = 'HANJIN' } = body

    if (!trackingNumber) {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400 }
      )
    }

    let result

    switch (courierCode) {
      case 'HANJIN':
        result = await trackHanjinPackage(trackingNumber)
        break
      default:
        result = {
          success: true,
          trackingNumber,
          status: 'Unknown',
          statusCode: 'UNKNOWN',
          currentLocation: '',
          deliveredAt: null,
          history: [],
          trackingUrl: getTrackingUrl(courierCode, trackingNumber),
        }
    }

    return NextResponse.json(result)

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Tracking failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const trackingNumber = searchParams.get('trackingNumber')
  const courierCode = searchParams.get('courierCode') || 'HANJIN'

  if (!trackingNumber) {
    return NextResponse.json(
      { error: 'Tracking number is required' },
      { status: 400 }
    )
  }

  let result

  switch (courierCode) {
    case 'HANJIN':
      result = await trackHanjinPackage(trackingNumber)
      break
    default:
      result = {
        success: true,
        trackingNumber,
        status: 'Unknown',
        statusCode: 'UNKNOWN',
        currentLocation: '',
        deliveredAt: null,
        history: [],
        trackingUrl: getTrackingUrl(courierCode, trackingNumber),
      }
  }

  return NextResponse.json(result)
}
