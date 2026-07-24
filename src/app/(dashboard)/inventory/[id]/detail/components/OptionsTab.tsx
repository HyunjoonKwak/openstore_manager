'use client'

import { Tag, Plus, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { NaverProductFullDetail, NaverOptionItem } from '@/lib/actions/naver-sync'
import type { UpdateField } from './types'

interface OptionsTabProps {
  productData: NaverProductFullDetail
  updateField: UpdateField
  newOptionRow: Partial<NaverOptionItem>
  setNewOptionRow: (value: Partial<NaverOptionItem>) => void
  addOption: () => void
  removeOption: (index: number) => void
  updateOption: (index: number, field: keyof NaverOptionItem, value: string | number | boolean) => void
}

export function OptionsTab({
  productData,
  updateField,
  newOptionRow,
  setNewOptionRow,
  addOption,
  removeOption,
  updateOption,
}: OptionsTabProps) {
  return (
    <TabsContent value="options" className="mt-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">옵션 그룹명</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>옵션1</Label>
              <Input value={productData.optionGroupNames?.optionGroupName1 || ''} onChange={(e) => updateField('optionGroupNames', { ...productData.optionGroupNames, optionGroupName1: e.target.value })} placeholder="예: 색상" />
            </div>
            <div className="space-y-2">
              <Label>옵션2</Label>
              <Input value={productData.optionGroupNames?.optionGroupName2 || ''} onChange={(e) => updateField('optionGroupNames', { ...productData.optionGroupNames, optionGroupName2: e.target.value })} placeholder="예: 사이즈" />
            </div>
            <div className="space-y-2">
              <Label>옵션3</Label>
              <Input value={productData.optionGroupNames?.optionGroupName3 || ''} onChange={(e) => updateField('optionGroupNames', { ...productData.optionGroupNames, optionGroupName3: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>옵션4</Label>
              <Input value={productData.optionGroupNames?.optionGroupName4 || ''} onChange={(e) => updateField('optionGroupNames', { ...productData.optionGroupNames, optionGroupName4: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">옵션 목록</CardTitle>
          <CardDescription>옵션별 가격/재고 관리</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">옵션값1</Label>
                <Input value={newOptionRow.optionName1 || ''} onChange={(e) => setNewOptionRow({ ...newOptionRow, optionName1: e.target.value })} placeholder="옵션값" />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">추가금액</Label>
                <Input type="number" value={newOptionRow.price || 0} onChange={(e) => setNewOptionRow({ ...newOptionRow, price: Number(e.target.value) })} />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">재고</Label>
                <Input type="number" value={newOptionRow.stockQuantity || 0} onChange={(e) => setNewOptionRow({ ...newOptionRow, stockQuantity: Number(e.target.value) })} />
              </div>
              <Button onClick={addOption} disabled={!newOptionRow.optionName1}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {productData.options && productData.options.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>옵션값</TableHead>
                    <TableHead className="w-28 text-right">추가금액</TableHead>
                    <TableHead className="w-24 text-right">재고</TableHead>
                    <TableHead className="w-20 text-center">판매</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productData.options.map((opt, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input value={opt.optionName1} onChange={(e) => updateOption(idx, 'optionName1', e.target.value)} className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={opt.price} onChange={(e) => updateOption(idx, 'price', Number(e.target.value))} className="h-8 text-right" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={opt.stockQuantity} onChange={(e) => updateOption(idx, 'stockQuantity', Number(e.target.value))} className="h-8 text-right" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={opt.usable !== false} onCheckedChange={(checked) => updateOption(idx, 'usable', checked)} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOption(idx)}>
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>등록된 옵션이 없습니다.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  )
}
