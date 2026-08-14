// Template renderer ported from detailpage_maker's Jinja2 setup
// (backend/app/services/renderer.py). Supports {{ var }} and
// {{ sections.key }} with HTML escaping (matching autoescape=True).

export interface RenderSections {
  hero: string
  features: string
  benefits: string
  details: string
  cta: string
}

export interface RenderContext {
  product_name: string
  category: string
  usp: string
  price_info: string
  target_customer: string
  mood: string
  sections: RenderSections
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character
  )
}

export function defaultSections(productName: string): RenderSections {
  return {
    hero: `${productName}과 함께하는 특별한 경험`,
    features: '최고의 품질과 합리적인 가격',
    benefits: '고객 만족을 위해 최선을 다합니다',
    details: '상세한 정보는 판매자에게 문의해주세요',
    cta: '지금 바로 만나보세요',
  }
}

export function buildRenderContext(
  interviewContext: Record<string, unknown>,
  sections?: Partial<RenderSections>
): RenderContext {
  const text = (key: string) =>
    typeof interviewContext[key] === 'string' ? (interviewContext[key] as string) : ''
  const productName = text('product_name') || '제품'

  return {
    product_name: productName,
    category: text('category') || '기타',
    usp: text('usp'),
    price_info: text('price_info'),
    target_customer: text('target_customer'),
    mood: text('mood'),
    sections: { ...defaultSections(productName), ...sections },
  }
}

/**
 * Substitute {{ var }} and {{ sections.key }} placeholders with escaped
 * values. Unknown placeholders resolve to an empty string, mirroring
 * Jinja2's default behavior for missing variables.
 */
export function renderTemplate(templateHtml: string, context: RenderContext): string {
  return templateHtml.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g, (_match, path: string) => {
    const [head, ...rest] = path.split('.')
    let value: unknown = (context as unknown as Record<string, unknown>)[head]
    for (const key of rest) {
      if (value && typeof value === 'object') value = (value as Record<string, unknown>)[key]
      else value = undefined
    }
    return typeof value === 'string' ? escapeHtml(value) : ''
  })
}
