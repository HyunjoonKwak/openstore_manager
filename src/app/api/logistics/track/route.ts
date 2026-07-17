import { NextRequest, NextResponse } from 'next/server'
import { trackPackage, getSupportedCarriers } from '@/lib/carriers'
import { createClient } from '@/lib/supabase/server'

async function isAuthenticated(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return Boolean(user)
}

export async function POST(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { trackingNumber, courierCode = 'HANJIN' } = body

    if (!trackingNumber) {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400 }
      )
    }

    const result = await trackPackage(courierCode, trackingNumber)
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
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const trackingNumber = searchParams.get('trackingNumber')
  const courierCode = searchParams.get('courierCode') || 'HANJIN'
  const listCarriers = searchParams.get('carriers')

  if (listCarriers === 'true') {
    const carriers = getSupportedCarriers()
    return NextResponse.json({ carriers })
  }

  if (!trackingNumber) {
    return NextResponse.json(
      { error: 'Tracking number is required' },
      { status: 400 }
    )
  }

  try {
    const result = await trackPackage(courierCode, trackingNumber)
    return NextResponse.json(result)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Tracking failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
