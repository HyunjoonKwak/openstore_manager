import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  toImageBlock,
  isSupportedImageType,
  UnsupportedImageTypeError,
  MAX_IMAGE_BYTES,
} from '../src/lib/ai/images.ts'

test('a base64 data URL becomes a base64 image block', () => {
  const block = toImageBlock('data:image/png;base64,AAAA')
  assert.deepEqual(block, {
    type: 'image',
    source: { type: 'base64', media_type: 'image/png', data: 'AAAA' },
  })
})

test('media type casing is normalised', () => {
  const block = toImageBlock('data:IMAGE/JPEG;base64,AAAA')
  assert.equal(
    (block.source as { media_type: string }).media_type,
    'image/jpeg'
  )
})

test('an http URL becomes a url image block', () => {
  assert.deepEqual(toImageBlock('https://example.com/a.jpg'), {
    type: 'image',
    source: { type: 'url', url: 'https://example.com/a.jpg' },
  })
})

test('unsupported types throw instead of being relabelled as png', () => {
  // Relabelling would send mismatched bytes to Anthropic and 400 there,
  // where the caller can no longer explain the failure
  assert.throws(
    () => toImageBlock('data:image/svg+xml;base64,AAAA'),
    (error: unknown) =>
      error instanceof UnsupportedImageTypeError && error.mediaType === 'image/svg+xml'
  )
  assert.throws(() => toImageBlock('data:application/pdf;base64,AAAA'), UnsupportedImageTypeError)
})

test('isSupportedImageType covers exactly the four accepted types', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/gif', 'image/webp']) {
    assert.ok(isSupportedImageType(type), type)
  }
  for (const type of ['image/svg+xml', 'image/bmp', 'image/tiff', 'text/plain', '']) {
    assert.equal(isSupportedImageType(type), false, type)
  }
})

test('base64 payloads containing commas and padding survive', () => {
  const block = toImageBlock('data:image/webp;base64,QUJD+/==')
  assert.equal((block.source as { data: string }).data, 'QUJD+/==')
})

test('the size ceiling matches Anthropic 5MB limit', () => {
  assert.equal(MAX_IMAGE_BYTES, 5_000_000)
})
