import type Anthropic from '@anthropic-ai/sdk'

/** Anthropic's accepted image types and per-image size ceiling. */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const
export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]

export const MAX_IMAGE_BYTES = 5_000_000

export class UnsupportedImageTypeError extends Error {
  // Explicit field, not a parameter property — node --test's type stripper
  // rejects the latter
  readonly mediaType: string

  constructor(mediaType: string) {
    super(`지원하지 않는 이미지 형식입니다: ${mediaType} (JPEG/PNG/GIF/WebP만 가능)`)
    this.name = 'UnsupportedImageTypeError'
    this.mediaType = mediaType
  }
}

export function isSupportedImageType(mediaType: string): mediaType is SupportedImageType {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mediaType.toLowerCase())
}

/**
 * Converts a data: URL or an http(s) URL into a Claude image block.
 * Throws on unsupported types rather than relabelling them — a forged
 * media_type reaches Anthropic as a byte/label mismatch and 400s there,
 * where the caller can no longer explain the failure.
 */
export function toImageBlock(source: string): Anthropic.ImageBlockParam {
  const dataUrl = source.match(/^data:([^;,]+);base64,(.+)$/)
  if (dataUrl) {
    const mediaType = dataUrl[1].toLowerCase()
    if (!isSupportedImageType(mediaType)) {
      throw new UnsupportedImageTypeError(mediaType)
    }
    return { type: 'image', source: { type: 'base64', media_type: mediaType, data: dataUrl[2] } }
  }
  return { type: 'image', source: { type: 'url', url: source } }
}
