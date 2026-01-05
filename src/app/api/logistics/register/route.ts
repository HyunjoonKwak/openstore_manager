import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { registerHanjinShipment, type RegisterShipmentInput } from '@/lib/logistics/hanjin'
import type { Json } from '@/types/database.types'

interface ApiConfigJson {
  hanjinApiKey?: string
  hanjinApiSecret?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { orderId, courierCode = 'HANJIN' } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        customer_name,
        customer_address,
        receiver_name,
        receiver_tel,
        zip_code,
        product_name,
        quantity,
        delivery_memo,
        stores!inner (
          id,
          user_id,
          api_config
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const storeData = order.stores as unknown as { id: string; user_id: string; api_config: Json }
    
    if (storeData.user_id !== userData.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const apiConfig = (storeData.api_config as ApiConfigJson) || {}

    const shipmentInput: RegisterShipmentInput = {
      orderId: order.id,
      senderName: 'SmartStore 셀러',
      senderTel: '010-0000-0000',
      senderAddress: '서울시 강남구',
      receiverName: order.receiver_name || order.customer_name || '',
      receiverTel: order.receiver_tel || '',
      receiverAddress: order.customer_address || '',
      receiverZipCode: order.zip_code || '',
      productName: order.product_name || '상품',
      quantity: order.quantity || 1,
      memo: order.delivery_memo || undefined,
    }

    let result

    switch (courierCode) {
      case 'HANJIN':
        result = await registerHanjinShipment(shipmentInput, {
          apiKey: apiConfig.hanjinApiKey,
          apiSecret: apiConfig.hanjinApiSecret,
        })
        break
      default:
        result = {
          success: false,
          error: 'Unsupported courier',
        }
    }

    if (result.success && result.trackingNumber) {
      await supabase
        .from('orders')
        .update({
          tracking_number: result.trackingNumber,
          courier_code: courierCode,
          status: 'Dispatched',
        })
        .eq('id', orderId)

      return NextResponse.json({
        success: true,
        trackingNumber: result.trackingNumber,
        courierCode,
      })
    }

    return NextResponse.json(
      { 
        success: false, 
        error: result.error || 'Failed to register shipment' 
      },
      { status: 500 }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Registration failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}
