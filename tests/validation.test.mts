import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  validateInput,
  idSchema,
  createProductSchema,
  updateProductSchema,
  updateOrderStatusSchema,
  createSupplierSchema,
  createOrUpdateSyncScheduleSchema,
  excelProductRowSchema,
  excelOrderRowSchema,
} from '../src/lib/validation.ts'

test('유효한 상품 payload는 통과한다', () => {
  const result = createProductSchema.safeParse({
    storeId: 'store-1',
    name: '테스트 상품',
    price: 15000,
    stockQuantity: 10,
    sku: 'SKU-001',
  })
  assert.equal(result.success, true)
})

test('선택 필드가 없는 상품 payload도 통과한다', () => {
  const result = createProductSchema.safeParse({
    storeId: 'store-1',
    name: '테스트 상품',
    price: 0,
  })
  assert.equal(result.success, true)
})

test('음수 가격은 실패한다', () => {
  const result = createProductSchema.safeParse({
    storeId: 'store-1',
    name: '테스트 상품',
    price: -1000,
  })
  assert.equal(result.success, false)
})

test('정수가 아닌 가격은 실패한다', () => {
  const result = createProductSchema.safeParse({
    storeId: 'store-1',
    name: '테스트 상품',
    price: 100.5,
  })
  assert.equal(result.success, false)
})

test('너무 긴 문자열은 실패한다', () => {
  const result = createProductSchema.safeParse({
    storeId: 'store-1',
    name: 'a'.repeat(201),
    price: 1000,
  })
  assert.equal(result.success, false)
})

test('빈 이름은 실패한다', () => {
  const result = createProductSchema.safeParse({
    storeId: 'store-1',
    name: '   ',
    price: 1000,
  })
  assert.equal(result.success, false)
})

test('잘못된 주문 상태 enum은 실패한다', () => {
  const invalid = updateOrderStatusSchema.safeParse({
    orderId: 'order-1',
    status: 'NotAStatus',
  })
  assert.equal(invalid.success, false)

  const valid = updateOrderStatusSchema.safeParse({
    orderId: 'order-1',
    status: 'Dispatched',
    syncToNaver: true,
  })
  assert.equal(valid.success, true)
})

test('잘못된 연락 수단 enum은 실패한다', () => {
  const result = createSupplierSchema.safeParse({
    name: '공급업체',
    contactMethod: 'Email',
  })
  assert.equal(result.success, false)
})

test('id는 빈 문자열과 100자 초과를 거부한다', () => {
  assert.equal(idSchema.safeParse('').success, false)
  assert.equal(idSchema.safeParse('x'.repeat(101)).success, false)
  assert.equal(idSchema.safeParse('2024123456789012').success, true)
})

test('부분 수정 payload는 제공된 필드만 검증한다', () => {
  assert.equal(updateProductSchema.safeParse({ id: 'p-1' }).success, true)
  assert.equal(updateProductSchema.safeParse({ id: 'p-1', supplierId: null }).success, true)
  assert.equal(updateProductSchema.safeParse({ id: 'p-1', price: -1 }).success, false)
})

test('동기화 일정 입력을 검증한다', () => {
  const valid = createOrUpdateSyncScheduleSchema.safeParse({
    storeId: 'store-1',
    syncType: 'orders',
    intervalMinutes: 60,
    isEnabled: true,
    syncAtMinute: 30,
    syncTime: '09:30',
  })
  assert.equal(valid.success, true)

  const badTime = createOrUpdateSyncScheduleSchema.safeParse({
    storeId: 'store-1',
    syncType: 'orders',
    intervalMinutes: 60,
    isEnabled: true,
    syncTime: '25:99',
  })
  assert.equal(badTime.success, false)
})

test('엑셀 상품 행은 문자열 숫자를 강제 변환한다', () => {
  const result = excelProductRowSchema.safeParse({
    name: '엑셀 상품',
    price: '15000',
    stock_quantity: '5',
  })
  assert.equal(result.success, true)
  if (result.success) {
    assert.equal(result.data.price, 15000)
    assert.equal(result.data.stock_quantity, 5)
  }

  assert.equal(
    excelProductRowSchema.safeParse({ name: '', price: 1000, stock_quantity: 0 }).success,
    false
  )
  assert.equal(
    excelProductRowSchema.safeParse({ name: '상품', price: 0, stock_quantity: 0 }).success,
    false
  )
})

test('엑셀 주문 행은 고객명을 요구한다', () => {
  const valid = excelOrderRowSchema.safeParse({
    customer_name: '홍길동',
    quantity: '2',
  })
  assert.equal(valid.success, true)

  const invalid = excelOrderRowSchema.safeParse({
    customer_name: '',
    quantity: 1,
  })
  assert.equal(invalid.success, false)
})

test('validateInput은 ZodError 대신 한국어 메시지를 반환한다', () => {
  const failure = validateInput(createProductSchema, {
    storeId: 'store-1',
    name: '상품',
    price: -1,
  })
  assert.equal(failure.data, null)
  assert.equal(failure.error, '입력값이 올바르지 않습니다: price')

  const success = validateInput(createProductSchema, {
    storeId: 'store-1',
    name: '상품',
    price: 1000,
  })
  assert.equal(success.error, null)
  assert.equal(success.data?.name, '상품')
})
