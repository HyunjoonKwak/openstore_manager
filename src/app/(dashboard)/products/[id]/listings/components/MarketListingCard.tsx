'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { PlatformBadge, REMOTE_STATUS_LABELS } from '@/components/markets/PlatformBadge'
import { upsertListing, publishListing, refreshListingSnapshot, type ListingDiff } from '@/lib/actions/listings'
import type { MarketAccountInfo } from '@/lib/actions/market-accounts'
import type { ListingSummary } from '@/lib/actions/master-products'
import { DiffTable } from './DiffTable'

// One market column of the side-by-side listings editor. Overridden
// fields are highlighted; inherited fields render dimmed with the
// master value. Publishing always passes the explicit PUBLISH gate.

interface OverrideFieldState {
  enabled: boolean
  value: string
}

export function MarketListingCard({
  account,
  masterProductId,
  masterName,
  masterPrice,
  listing,
  onChanged,
}: {
  account: MarketAccountInfo
  masterProductId: string
  masterName: string
  masterPrice: number
  listing: ListingSummary | null
  onChanged: () => void
}) {
  const [name, setName] = useState<OverrideFieldState>({
    enabled: false,
    value: '',
  })
  const [price, setPrice] = useState<OverrideFieldState>({
    enabled: listing?.priceOverride !== null && listing?.priceOverride !== undefined,
    value: listing?.priceOverride?.toString() || '',
  })
  const [category, setCategory] = useState('')
  const [templateNo, setTemplateNo] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false)
  const [diff, setDiff] = useState<ListingDiff | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const isCoupang = account.platform === 'coupang'

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const result = await upsertListing({
        masterProductId,
        marketAccountId: account.id,
        nameOverride: name.enabled && name.value.trim() ? name.value.trim() : null,
        priceOverride: price.enabled && price.value ? Number(price.value) : null,
        categoryOverride: category.trim() || undefined,
        platformFields: templateNo.trim() ? { templateProductNo: templateNo.trim() } : undefined,
      })
      if (result.data) {
        toast.success(`${account.name} 배포 설정이 저장되었습니다.`)
        onChanged()
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!listing) {
      toast.error('먼저 배포 설정을 저장해주세요.')
      return
    }
    setIsPublishing(true)
    try {
      const result = await publishListing(listing.listingId, 'PUBLISH')
      if (result.success) {
        toast.success(`${account.name}에 게시되었습니다.`)
        onChanged()
      } else {
        const detail = result.invalidInputs?.map((i) => `${i.field}: ${i.message}`).join('\n')
        toast.error(result.error || '게시에 실패했습니다.', { description: detail })
      }
    } finally {
      setIsPublishing(false)
      setPublishConfirmOpen(false)
    }
  }

  const handleRefreshDiff = async () => {
    if (!listing) return
    setIsRefreshing(true)
    try {
      const result = await refreshListingSnapshot(listing.listingId)
      if (result.data) setDiff(result.data)
      else toast.error(result.error || '마켓 상태 조회에 실패했습니다.')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Card className={cn('flex min-w-80 flex-1 flex-col', isCoupang && 'opacity-90')}>
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <PlatformBadge platform={account.platform} label={account.name} />
            {listing?.remoteStatus && (
              <span className="text-xs font-normal text-muted-foreground">
                {REMOTE_STATUS_LABELS[listing.remoteStatus] || listing.remoteStatus}
              </span>
            )}
          </span>
          {!listing && <span className="text-xs font-normal text-muted-foreground">미배포</span>}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        {isCoupang && (
          <p className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            쿠팡 연동은 준비 중입니다. 설정은 저장되고, 연동이 열리면 그대로 게시됩니다.
          </p>
        )}

        {/* 상품명 오버라이드 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">상품명</Label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox
                checked={!name.enabled}
                onCheckedChange={(checked) =>
                  setName((current) => ({ ...current, enabled: checked !== true }))
                }
              />
              원본 사용
            </label>
          </div>
          {name.enabled ? (
            <Input
              value={name.value}
              onChange={(e) => setName((current) => ({ ...current, value: e.target.value }))}
              placeholder={masterName}
              className="h-8 border-primary/50 text-[13px]"
            />
          ) : (
            <p className="truncate rounded-md bg-muted/50 px-3 py-1.5 text-[13px] text-muted-foreground">
              {masterName}
            </p>
          )}
        </div>

        {/* 판매가 오버라이드 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">판매가</Label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox
                checked={!price.enabled}
                onCheckedChange={(checked) =>
                  setPrice((current) => ({ ...current, enabled: checked !== true }))
                }
              />
              원본 사용
            </label>
          </div>
          {price.enabled ? (
            <Input
              type="number"
              inputMode="numeric"
              value={price.value}
              onChange={(e) => setPrice((current) => ({ ...current, value: e.target.value }))}
              placeholder={String(masterPrice)}
              className="h-8 border-primary/50 text-[13px]"
            />
          ) : (
            <p className="rounded-md bg-muted/50 px-3 py-1.5 text-[13px] tabular-nums text-muted-foreground">
              ₩{masterPrice.toLocaleString()}
            </p>
          )}
        </div>

        {/* 카테고리 */}
        <div className="space-y-1.5">
          <Label className="text-xs">
            {account.platform === 'naver' ? '리프 카테고리 ID' : '노출 카테고리 코드'}
          </Label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder={account.platform === 'naver' ? '50002451' : 'displayCategoryCode'}
            className="h-8 text-[13px]"
          />
        </div>

        {/* 네이버 신규 게시용 템플릿 */}
        {account.platform === 'naver' && !listing?.remoteRef && (
          <div className="space-y-1.5">
            <Label className="text-xs">템플릿 채널 상품번호 (신규 게시용)</Label>
            <Input
              value={templateNo}
              onChange={(e) => setTemplateNo(e.target.value)}
              placeholder="같은 상품군의 기존 채널 상품번호"
              className="h-8 text-[13px]"
            />
          </div>
        )}

        {listing?.remoteRef && (
          <DiffTable diff={diff} isRefreshing={isRefreshing} onRefresh={handleRefreshDiff} />
        )}

        <div className="mt-auto flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            설정 저장
          </Button>
          <Button
            size="sm"
            className="flex-1"
            disabled={!listing || isPublishing || isCoupang}
            onClick={() => setPublishConfirmOpen(true)}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {listing?.remoteRef ? '마켓에 반영' : '마켓에 게시'}
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {account.name}에 {listing?.remoteRef ? '변경사항을 반영' : '새 상품으로 게시'}합니다
            </AlertDialogTitle>
            <AlertDialogDescription>
              실제 마켓에 반영되는 작업입니다. 게시 요건이 부족하면 실행 전에 거부됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishing}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish} disabled={isPublishing}>
              {isPublishing && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {listing?.remoteRef ? '반영 실행' : '게시 실행'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
