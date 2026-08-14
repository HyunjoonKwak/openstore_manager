'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plug, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { PlatformBadge } from '@/components/markets/PlatformBadge'
import { PLATFORM_LABELS } from '@/lib/markets/labels'
import {
  createMarketAccount,
  updateMarketAccount,
  deleteMarketAccount,
  testMarketConnection,
  type MarketAccountInfo,
} from '@/lib/actions/market-accounts'
import type { MarketPlatformDb } from '@/types/redesign.types'

// Market account management — the redesign's account model. One card
// per connected account with platform-specific credential fields.
// Secret values are write-only; the UI shows only configured/empty.

const CREDENTIAL_FIELDS: Record<
  MarketPlatformDb,
  Array<{ key: string; label: string; secret: boolean }>
> = {
  naver: [
    { key: 'naverClientId', label: 'Client ID', secret: false },
    { key: 'naverClientSecret', label: 'Client Secret', secret: true },
    { key: 'naverSellerId', label: '판매자 ID (선택)', secret: false },
  ],
  coupang: [
    { key: 'coupangAccessKey', label: 'Access Key', secret: false },
    { key: 'coupangSecretKey', label: 'Secret Key', secret: true },
    { key: 'coupangVendorId', label: 'Vendor ID', secret: false },
  ],
}

function AccountCard({ account, onChanged }: { account: MarketAccountInfo; onChanged: () => void }) {
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const fields = CREDENTIAL_FIELDS[account.platform]

  const handleSave = async () => {
    const entries = Object.entries(credentials).filter(([, value]) => value.trim())
    if (entries.length === 0) {
      toast.error('변경할 값을 입력해주세요.')
      return
    }
    setIsSaving(true)
    try {
      const result = await updateMarketAccount({
        id: account.id,
        apiConfig: Object.fromEntries(entries.map(([key, value]) => [key, value.trim()])),
      })
      if (result.success) {
        toast.success('자격증명이 저장되었습니다.')
        setCredentials({})
        onChanged()
      } else {
        toast.error(result.error || '저장에 실패했습니다.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const result = await testMarketConnection(account.id)
      if (result.ok) toast.success('연결에 성공했습니다.')
      else toast.error(result.error || '연결에 실패했습니다.')
    } finally {
      setIsTesting(false)
    }
  }

  const handleDelete = async () => {
    const result = await deleteMarketAccount(account.id)
    if (result.success) {
      toast.success('마켓 계정이 삭제되었습니다.')
      onChanged()
    } else {
      toast.error(result.error || '삭제에 실패했습니다.')
    }
  }

  return (
    <Card>
      <CardHeader className="border-b border-border py-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <PlatformBadge platform={account.platform} />
            <span>{account.name}</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {fields.map((field) => {
          const configured = account.configuredKeys.includes(field.key)
          return (
            <div key={field.key} className="space-y-1">
              <Label className="flex items-center justify-between text-xs">
                {field.label}
                {configured && (
                  <span className="text-[11px] font-normal text-green-600">설정됨</span>
                )}
              </Label>
              <Input
                type={field.secret ? 'password' : 'text'}
                value={credentials[field.key] || ''}
                onChange={(e) =>
                  setCredentials((current) => ({ ...current, [field.key]: e.target.value }))
                }
                placeholder={configured ? '(변경할 때만 입력)' : '입력해주세요'}
                className="h-8 text-[13px]"
                autoComplete="off"
              />
            </div>
          )
        })}

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1" onClick={handleTest} disabled={isTesting}>
            {isTesting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="mr-1.5 h-3.5 w-3.5" />
            )}
            연결 테스트
          </Button>
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            저장
          </Button>
        </div>
      </CardContent>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="마켓 계정 삭제"
        itemName={account.name}
        description={`"${account.name}" 계정을 삭제하면 이 계정의 리스팅·주문 연결이 함께 삭제됩니다. 되돌릴 수 없습니다.`}
        onConfirm={handleDelete}
      />
    </Card>
  )
}

export function MarketAccountsTab({
  accounts,
  onChanged,
}: {
  accounts: MarketAccountInfo[]
  onChanged?: () => void
}) {
  const router = useRouter()
  const [newPlatform, setNewPlatform] = useState<MarketPlatformDb>('naver')
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const notifyChanged = () => {
    router.refresh()
    onChanged?.()
  }

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('계정 이름을 입력해주세요.')
      return
    }
    setIsCreating(true)
    try {
      const result = await createMarketAccount({ platform: newPlatform, name: newName.trim() })
      if (result.data) {
        toast.success('마켓 계정이 추가되었습니다. 자격증명을 입력해주세요.')
        setNewName('')
        notifyChanged()
      } else {
        toast.error(result.error || '추가에 실패했습니다.')
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">마켓 계정 추가</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-4 pt-0 sm:flex-row">
          <Select
            value={newPlatform}
            onValueChange={(value) => setNewPlatform(value as MarketPlatformDb)}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PLATFORM_LABELS) as MarketPlatformDb[]).map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {PLATFORM_LABELS[platform]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="계정 이름 (예: 내 스마트스토어)"
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            추가
          </Button>
        </CardContent>
      </Card>

      {accounts.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          아직 연결된 마켓 계정이 없습니다. 위에서 추가해주세요.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} onChanged={notifyChanged} />
          ))}
        </div>
      )}
    </div>
  )
}
