'use client'

import { Search, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { NaverProductFullDetail } from '@/lib/actions/naver-sync'
import type { SupplierSimple } from '@/lib/actions/suppliers'
import type { UpdateField } from './types'

interface BasicInfoTabProps {
  productData: NaverProductFullDetail
  updateField: UpdateField
  isFieldChanged: (field: keyof NaverProductFullDetail) => boolean
  getFieldStyle: (field: keyof NaverProductFullDetail) => string
  suppliers: SupplierSimple[]
  selectedSupplierId: string | null
  isSavingSupplier: boolean
  handleSupplierChange: (supplierId: string | null) => void
}

export function BasicInfoTab({
  productData,
  updateField,
  isFieldChanged,
  getFieldStyle,
  suppliers,
  selectedSupplierId,
  isSavingSupplier,
  handleSupplierChange,
}: BasicInfoTabProps) {
  return (
    <TabsContent value="basic" className="mt-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">상품 기본정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>상품명 {isFieldChanged('name') && <span className="text-yellow-500 text-xs ml-1">변경됨</span>}</Label>
              <Input value={productData.name} onChange={(e) => updateField('name', e.target.value)} className={getFieldStyle('name')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>판매가 {isFieldChanged('salePrice') && <span className="text-yellow-500 text-xs ml-1">변경됨</span>}</Label>
                <Input type="number" value={productData.salePrice} onChange={(e) => updateField('salePrice', Number(e.target.value))} className={getFieldStyle('salePrice')} />
              </div>
              <div className="space-y-2">
                <Label>재고수량 {isFieldChanged('stockQuantity') && <span className="text-yellow-500 text-xs ml-1">변경됨</span>}</Label>
                <Input type="number" value={productData.stockQuantity} onChange={(e) => updateField('stockQuantity', Number(e.target.value))} className={getFieldStyle('stockQuantity')} />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>카테고리</Label>
              <div className="flex gap-2">
                <Input value={productData.categoryName || ''} disabled className="flex-1" />
                <Button variant="outline" size="sm" disabled>
                  <Search className="h-4 w-4 mr-1" />검색
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">카테고리 변경은 스마트스토어 센터에서 가능합니다.</p>
            </div>
            <div className="space-y-2">
              <Label>브랜드 {isFieldChanged('brandName') && <span className="text-yellow-500 text-xs ml-1">변경됨</span>}</Label>
              <Input value={productData.brandName || ''} onChange={(e) => updateField('brandName', e.target.value)} className={getFieldStyle('brandName')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>모델명 {isFieldChanged('modelName') && <span className="text-yellow-500 text-xs ml-1">변경됨</span>}</Label>
                <Input value={productData.modelName || ''} onChange={(e) => updateField('modelName', e.target.value)} className={getFieldStyle('modelName')} />
              </div>
              <div className="space-y-2">
                <Label>제조사 {isFieldChanged('manufacturerName') && <span className="text-yellow-500 text-xs ml-1">변경됨</span>}</Label>
                <Input value={productData.manufacturerName || ''} onChange={(e) => updateField('manufacturerName', e.target.value)} className={getFieldStyle('manufacturerName')} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">판매자 관리 코드</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>판매자 관리코드 (SKU)</Label>
              <Input value={productData.sellerManagementCode || ''} onChange={(e) => updateField('sellerManagementCode', e.target.value)} placeholder="자체 상품코드" />
            </div>
            <div className="space-y-2">
              <Label>바코드</Label>
              <Input value={productData.sellerBarcode || ''} onChange={(e) => updateField('sellerBarcode', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>커스텀 코드 1</Label>
                <Input value={productData.sellerCustomCode1 || ''} onChange={(e) => updateField('sellerCustomCode1', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>커스텀 코드 2</Label>
                <Input value={productData.sellerCustomCode2 || ''} onChange={(e) => updateField('sellerCustomCode2', e.target.value)} />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>원산지</Label>
              <Input value={productData.originArea || ''} onChange={(e) => updateField('originArea', e.target.value)} placeholder="예: 국내산, 중국산" />
            </div>
            <div className="space-y-2">
              <Label>수입사</Label>
              <Input value={productData.importer || ''} onChange={(e) => updateField('importer', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              공급업체
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>공급업체 선택</Label>
              <Select
                value={selectedSupplierId || 'none'}
                onValueChange={(v) => handleSupplierChange(v === 'none' ? null : v)}
                disabled={isSavingSupplier}
              >
                <SelectTrigger>
                  <SelectValue placeholder="공급업체를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">없음</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      <div className="flex items-center gap-2">
                        <span>{supplier.name}</span>
                        {supplier.contactNumber && (
                          <span className="text-xs text-muted-foreground">
                            ({supplier.contactMethod}: {supplier.contactNumber})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {suppliers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  등록된 공급업체가 없습니다. 공급업체 관리에서 추가하세요.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">상품 상태 및 인증</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>상품 상태</Label>
                <Input value={productData.saleType === 'NEW' ? '신상품' : productData.saleType === 'OLD' ? '중고' : productData.saleType || ''} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>판매 상태</Label>
                <Input value={
                  productData.statusType === 'SALE' ? '판매중' :
                  productData.statusType === 'SUSPENSION' ? '판매중지' :
                  productData.statusType === 'OUTOFSTOCK' ? '품절' :
                  productData.statusType === 'PROHIBITION' ? '판매금지' :
                  productData.statusType === 'WAIT' ? '판매대기' :
                  productData.statusType || ''
                } disabled className="bg-muted" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>KC 인증 면제 유형</Label>
              <Input value={
                productData.kcExemptionType === 'OVERSEAS_DIRECT_PURCHASE' ? '해외직구' :
                productData.kcExemptionType === 'PARALLEL_IMPORT' ? '병행수입' :
                productData.kcExemptionType === 'ETC' ? '기타' :
                productData.kcExemptionType || '해당없음'
              } disabled className="bg-muted" />
            </div>
            {productData.certifications && productData.certifications.length > 0 && (
              <div className="space-y-2">
                <Label>인증 정보</Label>
                <div className="space-y-2">
                  {productData.certifications.map((cert, idx) => (
                    <div key={idx} className="p-3 border rounded-lg text-sm">
                      <div className="font-medium">{cert.name || cert.certificationKindType}</div>
                      {cert.certificationNumber && <div className="text-muted-foreground">인증번호: {cert.certificationNumber}</div>}
                      {cert.companyName && <div className="text-muted-foreground">업체: {cert.companyName}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {productData.productAttributes && productData.productAttributes.length > 0 && (
              <div className="space-y-2">
                <Label>상품 속성</Label>
                <div className="space-y-1">
                  {productData.productAttributes.map((attr, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground">
                      속성 ID: {attr.attributeId} {attr.attributeValue && `- ${attr.attributeValue}`}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  )
}
