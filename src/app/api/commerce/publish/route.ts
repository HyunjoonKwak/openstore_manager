import { NextResponse } from 'next/server'
import { formatCommerceError, getCurrentNaverClient } from '@/lib/naver/current-client'

const COMMERCE_BASE = 'https://api.commerce.naver.com/external'

interface PublishInput {
  confirmation?: string
  templateProductNo?: string
  name?: string
  price?: number
  stock?: number
  categoryId?: string
  detailContent?: string
  imageData?: string
}

function removeGeneratedNumbers(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeGeneratedNumbers)
  if (!value || typeof value !== 'object') return value

  const result: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (['originProductNo', 'channelProductNo', 'groupProductNo', 'windowChannelProductNo', 'smartstoreChannelProductNo'].includes(key)) continue
    result[key] = removeGeneratedNumbers(child)
  }
  return result
}

async function uploadProductImage(token: string, imageData: string) {
  const match = imageData.match(/^data:(image\/(?:jpeg|png|gif|bmp));base64,(.+)$/)
  if (!match) throw new Error('대표 이미지는 JPG, PNG, GIF 또는 BMP 파일이어야 합니다.')

  const mime = match[1]
  const bytes = Buffer.from(match[2], 'base64')
  if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('대표 이미지는 10MB 이하여야 합니다.')

  const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]
  const form = new FormData()
  form.append('imageFiles', new Blob([bytes], { type: mime }), `product-${Date.now()}.${extension}`)

  const response = await fetch(`${COMMERCE_BASE}/v1/product-images/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;charset=UTF-8' },
    body: form,
    signal: AbortSignal.timeout(30_000),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.message || '대표 이미지를 업로드하지 못했습니다.')
  const url = data?.images?.[0]?.url || data?.[0]?.url || data?.imageUrls?.[0]
  if (!url) throw new Error('업로드된 이미지 URL을 확인하지 못했습니다.')
  return String(url)
}

export async function POST(request: Request) {
  let input: PublishInput
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ message: '게시 요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  if (input.confirmation !== 'PUBLISH') {
    return NextResponse.json({ message: '최종 게시 확인이 필요합니다.' }, { status: 400 })
  }
  if (!input.templateProductNo || !/^\d+$/.test(input.templateProductNo)) {
    return NextResponse.json({ message: '같은 상품군의 템플릿 채널 상품번호가 필요합니다.' }, { status: 400 })
  }
  if (!input.name?.trim() || !input.price || !input.stock || !input.detailContent || !input.imageData) {
    return NextResponse.json({ message: '상품명, 가격, 재고, 상세내용, 대표 이미지를 모두 입력해주세요.' }, { status: 400 })
  }
  if (input.name.trim().length > 100) {
    return NextResponse.json({ message: '상품명은 100자 이하여야 합니다.' }, { status: 400 })
  }
  if (!Number.isFinite(input.price) || input.price <= 0 || !Number.isFinite(input.stock) || input.stock <= 0) {
    return NextResponse.json({ message: '판매가와 재고는 0보다 큰 숫자여야 합니다.' }, { status: 400 })
  }
  if (!input.categoryId?.trim() || !/^\d+$/.test(input.categoryId)) {
    return NextResponse.json({ message: '최종 리프 카테고리 ID가 필요합니다.' }, { status: 400 })
  }
  if (input.detailContent.length > 2_000_000) {
    return NextResponse.json({ message: '상세페이지 내용이 너무 큽니다.' }, { status: 413 })
  }

  const { client, error } = await getCurrentNaverClient()
  if (!client) return NextResponse.json({ message: error }, { status: 503 })

  try {
    const token = await client.getAccessToken()
    const templateResponse = await fetch(
      `${COMMERCE_BASE}/v2/products/channel-products/${input.templateProductNo}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json;charset=UTF-8' }, cache: 'no-store' }
    )
    const template = await templateResponse.json()
    if (!templateResponse.ok) throw new Error(template?.message || '템플릿 상품을 불러오지 못했습니다.')
    if (!template.originProduct || !template.smartstoreChannelProduct) {
      throw new Error('템플릿 상품 구조를 확인할 수 없습니다.')
    }

    const imageUrl = await uploadProductImage(token, input.imageData)
    const originProduct = removeGeneratedNumbers(template.originProduct) as Record<string, unknown>
    originProduct.statusType = 'SALE'
    originProduct.name = input.name.trim()
    originProduct.salePrice = Math.round(input.price)
    originProduct.stockQuantity = Math.round(input.stock)
    originProduct.detailContent = input.detailContent.replaceAll('__PRODUCT_IMAGE_URL__', imageUrl)
    originProduct.images = { representativeImage: { url: imageUrl }, optionalImages: [] }
    if (input.categoryId?.trim()) originProduct.leafCategoryId = input.categoryId.trim()

    const smartstoreChannelProduct = removeGeneratedNumbers(template.smartstoreChannelProduct) as Record<string, unknown>
    smartstoreChannelProduct.channelProductName = input.name.trim()
    smartstoreChannelProduct.channelProductDisplayStatusType = 'ON'

    const response = await fetch(`${COMMERCE_BASE}/v2/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json;charset=UTF-8',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ originProduct, smartstoreChannelProduct }),
      signal: AbortSignal.timeout(30_000),
    })
    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || '상품 등록이 거절되었습니다.', invalidInputs: data?.invalidInputs || [] },
        { status: response.status }
      )
    }

    return NextResponse.json({
      published: true,
      originProductNo: data.originProductNo,
      smartstoreChannelProductNo: data.smartstoreChannelProductNo,
    })
  } catch (publishError) {
    return NextResponse.json(
      { message: formatCommerceError(publishError, '상품을 게시하지 못했습니다.') },
      { status: 502 }
    )
  }
}
