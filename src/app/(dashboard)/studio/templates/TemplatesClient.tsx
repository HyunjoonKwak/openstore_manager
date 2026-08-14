'use client'

import { useMemo, useState } from 'react'
import { LayoutTemplate } from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { buildRenderContext, renderTemplate } from '@/lib/studio/render'
import type { StudioTemplateRow } from '@/types/redesign.types'

// Template gallery ported from detailpage_maker. Preview renders the
// template with sample data inside a sandboxed iframe.

const CATEGORY_LABELS: Record<string, string> = {
  default: '기본',
  fashion: '패션/의류',
  beauty: '뷰티/화장품',
  food: '식품',
  electronics: '전자기기',
  home: '생활용품',
}

const SAMPLE_CONTEXT = {
  product_name: '샘플 상품',
  category: '샘플 카테고리',
  usp: '이 상품만의 특별한 차별점',
  price_info: '29,900원',
  target_customer: '30대 직장인',
  mood: '심플한',
}

export function TemplatesClient({ templates }: { templates: StudioTemplateRow[] }) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [previewTemplate, setPreviewTemplate] = useState<StudioTemplateRow | null>(null)

  const categories = useMemo(
    () => ['all', ...new Set(templates.map((template) => template.category))],
    [templates]
  )

  const filtered = useMemo(
    () =>
      categoryFilter === 'all'
        ? templates
        : templates.filter((template) => template.category === categoryFilter),
    [templates, categoryFilter]
  )

  const previewHtml = useMemo(
    () =>
      previewTemplate
        ? renderTemplate(previewTemplate.html_template, buildRenderContext(SAMPLE_CONTEXT))
        : '',
    [previewTemplate]
  )

  return (
    <>
      <Header title="템플릿" subtitle="상세페이지 템플릿 갤러리" />

      <div className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
        <div className="mb-4 flex gap-1.5 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={cn(
                'h-8 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors',
                categoryFilter === category
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground'
              )}
            >
              {category === 'all' ? '전체' : CATEGORY_LABELS[category] || category}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <LayoutTemplate className="mx-auto mb-3 h-10 w-10" />
            <p className="font-medium">템플릿이 없습니다</p>
            <p className="text-sm">시드 마이그레이션(111)을 적용하면 기본 템플릿 8종이 등록됩니다.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer py-0 transition-all hover:ring-2 hover:ring-primary/50"
                onClick={() => setPreviewTemplate(template)}
              >
                <CardHeader className="py-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    {template.name}
                    <span className="flex items-center gap-1.5">
                      {template.is_default && (
                        <Badge variant="secondary" className="text-[10px]">
                          기본
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORY_LABELS[template.category] || template.category}
                      </Badge>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {template.description || '설명 없음'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={previewTemplate !== null} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name} — 샘플 데이터 미리보기</DialogTitle>
          </DialogHeader>
          <iframe
            srcDoc={previewHtml}
            title="템플릿 미리보기"
            className="min-h-0 w-full flex-1 rounded-lg border border-border bg-white"
            style={{ minHeight: '60vh' }}
            sandbox=""
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
