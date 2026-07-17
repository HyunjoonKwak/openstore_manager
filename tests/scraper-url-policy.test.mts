import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { validateUrl } from '../src/lib/scraper/playwright-scraper.ts'

afterEach(() => {
  delete process.env.SCRAPER_ALLOWED_HOSTS
})

test('허용된 쇼핑몰의 HTTPS 상품 URL을 통과시킨다', () => {
  const result = validateUrl('https://smartstore.naver.com/example/products/12345')
  assert.equal(result.isValid, true)
  assert.equal(result.platform, 'naver_smart_store')
})

test('HTTP와 허용되지 않은 호스트를 차단한다', () => {
  assert.equal(validateUrl('http://smartstore.naver.com/example/products/12345').isValid, false)
  assert.equal(validateUrl('https://127.0.0.1/admin').isValid, false)
  assert.equal(validateUrl('https://smartstore.naver.com.attacker.example/products/12345').isValid, false)
})

test('운영자가 명시한 추가 호스트만 허용한다', () => {
  process.env.SCRAPER_ALLOWED_HOSTS = 'shop.example.com'
  assert.equal(validateUrl('https://shop.example.com/products/1').isValid, true)
  assert.equal(validateUrl('https://other.example.com/products/1').isValid, false)
})
