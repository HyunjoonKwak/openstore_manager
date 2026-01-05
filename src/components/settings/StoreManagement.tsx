'use client'

import { useState, useTransition } from 'react'
import { Store, Plus, Trash2, Edit2, Check, X, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStore } from '@/contexts/StoreContext'
import { createStore, updateStore, deleteStore, type StoreInfo } from '@/lib/actions/store-management'
import { toast } from 'sonner'
import type { Platform } from '@/types/database.types'

interface StoreFormData {
  storeName: string
  platform: Platform
  naverClientId: string
  naverClientSecret: string
  openaiApiKey: string
}

const defaultFormData: StoreFormData = {
  storeName: '',
  platform: 'Naver',
  naverClientId: '',
  naverClientSecret: '',
  openaiApiKey: '',
}

export function StoreManagement() {
  const { stores, currentStore, switchStore, refreshStores } = useStore()
  const [isPending, startTransition] = useTransition()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<StoreInfo | null>(null)
  const [deletingStore, setDeletingStore] = useState<StoreInfo | null>(null)
  const [formData, setFormData] = useState<StoreFormData>(defaultFormData)

  const handleAddStore = () => {
    if (!formData.storeName) {
      toast.error('스토어 이름을 입력해주세요.')
      return
    }

    startTransition(async () => {
      const result = await createStore({
        storeName: formData.storeName,
        platform: formData.platform,
        naverClientId: formData.naverClientId || undefined,
        naverClientSecret: formData.naverClientSecret || undefined,
        openaiApiKey: formData.openaiApiKey || undefined,
      })

      if (result.data) {
        toast.success('스토어가 추가되었습니다.')
        setIsAddDialogOpen(false)
        setFormData(defaultFormData)
        await refreshStores()
      } else {
        toast.error(result.error || '스토어 추가에 실패했습니다.')
      }
    })
  }

  const handleUpdateStore = () => {
    if (!editingStore || !formData.storeName) {
      toast.error('스토어 이름을 입력해주세요.')
      return
    }

    startTransition(async () => {
      const result = await updateStore(editingStore.id, {
        storeName: formData.storeName,
        platform: formData.platform,
        naverClientId: formData.naverClientId,
        naverClientSecret: formData.naverClientSecret,
        openaiApiKey: formData.openaiApiKey,
      })

      if (result.success) {
        toast.success('스토어 정보가 수정되었습니다.')
        setEditingStore(null)
        setFormData(defaultFormData)
        await refreshStores()
      } else {
        toast.error(result.error || '수정에 실패했습니다.')
      }
    })
  }

  const handleDeleteStore = (storeId: string) => {
    startTransition(async () => {
      const result = await deleteStore(storeId)

      if (result.success) {
        toast.success('스토어가 삭제되었습니다.')
        await refreshStores()
      } else {
        toast.error(result.error || '삭제에 실패했습니다.')
      }
    })
  }

  const openEditDialog = (store: StoreInfo) => {
    setEditingStore(store)
    setFormData({
      storeName: store.storeName,
      platform: store.platform,
      naverClientId: store.apiConfig.naverClientId || '',
      naverClientSecret: store.apiConfig.naverClientSecret || '',
      openaiApiKey: store.apiConfig.openaiApiKey || '',
    })
  }

  const StoreForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="storeName">스토어 이름 *</Label>
        <Input
          id="storeName"
          value={formData.storeName}
          onChange={(e) => setFormData((prev) => ({ ...prev, storeName: e.target.value }))}
          placeholder="예: 내 스마트스토어"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="platform">플랫폼</Label>
        <Select
          value={formData.platform}
          onValueChange={(value) => setFormData((prev) => ({ ...prev, platform: value as Platform }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Naver">네이버 스마트스토어</SelectItem>
            <SelectItem value="Coupang">쿠팡</SelectItem>
            <SelectItem value="Gmarket">G마켓</SelectItem>
            <SelectItem value="11st">11번가</SelectItem>
            <SelectItem value="Other">기타</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />
      <div className="space-y-2">
        <Label htmlFor="naverClientId">네이버 Client ID</Label>
        <Input
          id="naverClientId"
          value={formData.naverClientId}
          onChange={(e) => setFormData((prev) => ({ ...prev, naverClientId: e.target.value }))}
          placeholder="애플리케이션 Client ID"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="naverClientSecret">네이버 Client Secret</Label>
        <Input
          id="naverClientSecret"
          type="password"
          value={formData.naverClientSecret}
          onChange={(e) => setFormData((prev) => ({ ...prev, naverClientSecret: e.target.value }))}
          placeholder={isEdit ? '변경시에만 입력' : '••••••••'}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="openaiApiKey">OpenAI API 키 (선택)</Label>
        <Input
          id="openaiApiKey"
          type="password"
          value={formData.openaiApiKey}
          onChange={(e) => setFormData((prev) => ({ ...prev, openaiApiKey: e.target.value }))}
          placeholder="sk-••••••••"
        />
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>스토어 관리</CardTitle>
              <CardDescription>연결된 스토어 목록 및 설정</CardDescription>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setFormData(defaultFormData)}>
                <Plus className="h-4 w-4 mr-1" />
                스토어 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 스토어 추가</DialogTitle>
                <DialogDescription>
                  새로운 스토어의 정보와 API 키를 입력하세요.
                </DialogDescription>
              </DialogHeader>
              <StoreForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handleAddStore} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  추가
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              등록된 스토어가 없습니다.
            </div>
          ) : (
            stores.map((store) => (
              <div
                key={store.id}
                className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                  currentStore?.id === store.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{store.storeName}</span>
                      {currentStore?.id === store.id && (
                        <Badge variant="secondary" className="text-xs">현재</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{store.platform}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentStore?.id !== store.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => switchStore(store.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      선택
                    </Button>
                  )}
                  <Dialog open={editingStore?.id === store.id} onOpenChange={(open) => !open && setEditingStore(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(store)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>스토어 수정</DialogTitle>
                        <DialogDescription>
                          스토어 정보를 수정합니다.
                        </DialogDescription>
                      </DialogHeader>
                      <StoreForm isEdit />
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingStore(null)}>
                          취소
                        </Button>
                        <Button onClick={handleUpdateStore} disabled={isPending}>
                          {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          저장
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeletingStore(store)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <Dialog open={!!deletingStore} onOpenChange={(open) => !open && setDeletingStore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>스토어 삭제</DialogTitle>
            <DialogDescription>
              &quot;{deletingStore?.storeName}&quot; 스토어를 삭제하시겠습니까?
              <br />
              관련된 모든 상품, 주문 데이터가 함께 삭제됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingStore(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingStore) {
                  handleDeleteStore(deletingStore.id)
                  setDeletingStore(null)
                }
              }}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
