import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  generateSupplierMessage,
  generateEnglishMessage,
  type OrderForMessage,
  type SupplierForMessage,
} from '../src/lib/message-generator.ts'

const supplier: SupplierForMessage = { name: '한빛유통' }

const orders: OrderForMessage[] = [
  { product: { sku: 'SKU-001', name: '무선 마우스' }, quantity: 2, total: 30000 },
  { product: { sku: 'SKU-002', name: '기계식 키보드' }, quantity: 1, total: 89000 },
]

test('한국어 발주 메시지에 공급업체명과 품목 목록이 포함된다', () => {
  const message = generateSupplierMessage(orders, supplier)

  assert.ok(message.startsWith('안녕하세요, 한빛유통님'))
  assert.ok(message.includes('1. [SKU-001] 무선 마우스 x 2'))
  assert.ok(message.includes('2. [SKU-002] 기계식 키보드 x 1'))
  assert.ok(message.includes('수신 확인 부탁드립니다. 감사합니다!'))
})

test('한국어 메시지의 건수/수량/금액이 정확하다', () => {
  const message = generateSupplierMessage(orders, supplier)

  assert.ok(message.includes('총 2건, 3개'))
  // 30000 + 89000 = 119000 KRW, formatted with ko-KR currency style
  assert.ok(message.includes('₩119,000'))
})

test('빈 주문 배열도 안전하게 처리한다 (한국어)', () => {
  const message = generateSupplierMessage([], supplier)

  assert.ok(message.includes('총 0건, 0개'))
  assert.ok(message.includes('₩0'))
})

test('영어 발주 메시지에 공급업체명과 품목 목록이 포함된다', () => {
  const message = generateEnglishMessage(orders, supplier)

  assert.ok(message.startsWith('Hello 한빛유통,'))
  assert.ok(message.includes('1. [SKU-001] 무선 마우스 x 2'))
  assert.ok(message.includes('2. [SKU-002] 기계식 키보드 x 1'))
  assert.ok(message.includes('Please confirm receipt. Thanks!'))
})

test('영어 메시지는 KRW를 1300으로 나눈 USD 금액을 표시한다', () => {
  const message = generateEnglishMessage(orders, supplier)

  assert.ok(message.includes('Total: 2 orders, 3 items'))
  // 119000 / 1300 = 91.538... -> $91.54 in en-US currency format
  assert.ok(message.includes('$91.54'))
})

test('빈 주문 배열도 안전하게 처리한다 (영어)', () => {
  const message = generateEnglishMessage([], supplier)

  assert.ok(message.includes('Total: 0 orders, 0 items'))
  assert.ok(message.includes('$0.00'))
})

test('주문 1건일 때 품목 번호가 1부터 시작한다', () => {
  const single: OrderForMessage[] = [
    { product: { sku: 'A-1', name: '테스트 상품' }, quantity: 5, total: 5000 },
  ]
  const message = generateSupplierMessage(single, supplier)

  assert.ok(message.includes('1. [A-1] 테스트 상품 x 5'))
  assert.ok(message.includes('총 1건, 5개'))
  assert.ok(message.includes('₩5,000'))
})
