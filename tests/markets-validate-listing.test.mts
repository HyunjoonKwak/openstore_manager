import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateNaverListing } from '../src/lib/markets/naver/validate-listing.ts'
import { validateCoupangListing } from '../src/lib/markets/coupang/adapter.ts'
import type { ListingDraft } from '../src/lib/markets/types.ts'

function draft(overrides: Partial<ListingDraft> = {}): ListingDraft {
  return {
    name: '스테인리스 텀블러 500ml',
    price: 29900,
    stockQuantity: 48,
    categoryId: '50002451',
    detailContent: '<p>상세 내용</p>',
    imageUrl: 'https://example.com/img.jpg',
    extraImageUrls: [],
    brand: '마이브랜드',
    options: [],
    platformFields: {},
    ...overrides,
  }
}

test('naver: complete draft passes', () => {
  assert.deepEqual(validateNaverListing(draft()), [])
})

test('naver: missing required fields are each reported', () => {
  const issues = validateNaverListing(
    draft({ name: '  ', price: 0, categoryId: null, imageUrl: null, detailContent: null })
  )
  const fields = issues.map((i) => i.field)
  assert.ok(fields.includes('name'))
  assert.ok(fields.includes('price'))
  assert.ok(fields.includes('categoryId'))
  assert.ok(fields.includes('imageUrl'))
  assert.ok(fields.includes('detailContent'))
})

test('naver: name over 100 chars rejected', () => {
  const issues = validateNaverListing(draft({ name: '가'.repeat(101) }))
  assert.equal(issues.length, 1)
  assert.equal(issues[0].code, 'too_long')
})

test('naver: non-numeric category id rejected', () => {
  const issues = validateNaverListing(draft({ categoryId: 'abc123' }))
  assert.equal(issues[0].code, 'invalid')
  assert.equal(issues[0].field, 'categoryId')
})

test('naver: option with non-positive final price rejected', () => {
  const issues = validateNaverListing(
    draft({
      options: [
        { displayName: '블랙', sku: null, priceDelta: 0, stockQuantity: 3 },
        { displayName: '화이트', sku: null, priceDelta: -29900, stockQuantity: 3 },
      ],
    })
  )
  assert.equal(issues.length, 1)
  assert.equal(issues[0].field, 'options[1].priceDelta')
})

test('coupang: price must be multiple of 10 won', () => {
  const issues = validateCoupangListing(draft({ price: 29905 }))
  assert.ok(issues.some((i) => i.code === 'invalid_unit'))
})

test('coupang: requires brand and display category', () => {
  const issues = validateCoupangListing(draft({ brand: null, categoryId: null }))
  const fields = issues.map((i) => i.field)
  assert.ok(fields.includes('brand'))
  assert.ok(fields.includes('categoryId'))
})

test('coupang: complete draft passes', () => {
  assert.deepEqual(validateCoupangListing(draft()), [])
})
