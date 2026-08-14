import type { ListingDraft, ValidationIssue } from '../types'

// Naver SmartStore publish requirements, extracted from the former
// /api/commerce/publish server-side gate. Pure function — runs over
// every list row to power the "준비 안 됨" badge without API calls.

const MAX_NAME_LENGTH = 100
const MAX_DETAIL_CONTENT_BYTES = 2_000_000

export function validateNaverListing(input: ListingDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!input.name.trim()) {
    issues.push({ field: 'name', code: 'required', message: '상품명이 필요합니다.' })
  } else if (input.name.trim().length > MAX_NAME_LENGTH) {
    issues.push({
      field: 'name',
      code: 'too_long',
      message: `상품명은 ${MAX_NAME_LENGTH}자 이하여야 합니다.`,
    })
  }

  if (!Number.isFinite(input.price) || input.price <= 0) {
    issues.push({ field: 'price', code: 'invalid', message: '판매가는 0보다 커야 합니다.' })
  }

  if (!Number.isFinite(input.stockQuantity) || input.stockQuantity < 0) {
    issues.push({ field: 'stockQuantity', code: 'invalid', message: '재고는 0 이상이어야 합니다.' })
  }

  if (!input.categoryId?.trim()) {
    issues.push({
      field: 'categoryId',
      code: 'required',
      message: '최종 리프 카테고리 ID가 필요합니다.',
    })
  } else if (!/^\d+$/.test(input.categoryId.trim())) {
    issues.push({
      field: 'categoryId',
      code: 'invalid',
      message: '카테고리 ID는 숫자여야 합니다.',
    })
  }

  if (!input.imageUrl) {
    issues.push({ field: 'imageUrl', code: 'required', message: '대표 이미지가 필요합니다.' })
  }

  if (!input.detailContent?.trim()) {
    issues.push({
      field: 'detailContent',
      code: 'required',
      message: '상세페이지 내용이 필요합니다.',
    })
  } else if (input.detailContent.length > MAX_DETAIL_CONTENT_BYTES) {
    issues.push({
      field: 'detailContent',
      code: 'too_long',
      message: '상세페이지 내용이 너무 큽니다.',
    })
  }

  for (const [index, option] of input.options.entries()) {
    if (!option.displayName.trim()) {
      issues.push({
        field: `options[${index}].displayName`,
        code: 'required',
        message: `옵션 ${index + 1}의 이름이 필요합니다.`,
      })
    }
    if (input.price + option.priceDelta <= 0) {
      issues.push({
        field: `options[${index}].priceDelta`,
        code: 'invalid',
        message: `옵션 ${index + 1}의 최종 가격이 0 이하입니다.`,
      })
    }
  }

  return issues
}
