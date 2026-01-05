'use client'

import { useState, useEffect, useTransition, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  RefreshCw,
  Upload,
  Eye,
  Code,
  Loader2,
  Sparkles,
  AlertTriangle,
  Package,
  Truck,
  Phone,
  Tag,
  ImageIcon,
  Settings,
  Search,
  FileText,
  Gift,
  Plus,
  X,
  Percent,
  Info,
} from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  getProductDetailFromNaver,
  updateProductDetailToNaver,
  type NaverProductFullDetail,
  type UpdateProductToNaverInput,
  type NaverOptionItem,
} from '@/lib/actions/naver-sync'
import { getSuppliersSimple, type SupplierSimple } from '@/lib/actions/suppliers'
import { updateProduct } from '@/lib/actions/products'
import { Building2 } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

const PRODUCT_INFO_NOTICE_TYPES = [
  { value: 'WEAR', label: '의류' },
  { value: 'SHOES', label: '신발' },
  { value: 'BAG', label: '가방' },
  { value: 'FASHION_ITEMS', label: '패션잡화' },
  { value: 'SLEEPING_GEAR', label: '침구류' },
  { value: 'FURNITURE', label: '가구' },
  { value: 'IMAGE_APPLIANCES', label: '영상가전' },
  { value: 'HOME_APPLIANCES', label: '가정용 전기제품' },
  { value: 'SEASON_APPLIANCES', label: '계절가전' },
  { value: 'OFFICE_APPLIANCES', label: '사무용기기' },
  { value: 'OPTICS_APPLIANCES', label: '광학기기' },
  { value: 'MICROELECTRONICS', label: '소형전자' },
  { value: 'CELLPHONE', label: '휴대폰' },
  { value: 'NAVIGATION', label: '내비게이션' },
  { value: 'CAR_ARTICLES', label: '자동차용품' },
  { value: 'MEDICAL_APPLIANCES', label: '의료기기' },
  { value: 'KITCHEN_UTENSILS', label: '주방용품' },
  { value: 'COSMETIC', label: '화장품' },
  { value: 'JEWELLERY', label: '귀금속/보석' },
  { value: 'FOOD', label: '식품' },
  { value: 'GENERAL_FOOD', label: '가공식품' },
  { value: 'HEALTH_FUNCTIONAL_FOOD', label: '건강기능식품' },
  { value: 'KIDS', label: '어린이제품' },
  { value: 'SPORTS_EQUIPMENT', label: '스포츠용품' },
  { value: 'BOOKS', label: '서적' },
  { value: 'RENTAL_ETC', label: '물품대여(기타)' },
  { value: 'DIGITAL_CONTENTS', label: '디지털콘텐츠' },
  { value: 'GIFT_CARD', label: '상품권' },
  { value: 'BIOPHARMACEUTICAL', label: '생활화학제품' },
  { value: 'ETC', label: '기타' },
]

const DELIVERY_FEE_TYPES = [
  { value: 'FREE', label: '무료배송' },
  { value: 'PAID', label: '유료배송' },
  { value: 'CONDITIONAL_FREE', label: '조건부 무료' },
  { value: 'QUANTITY_PAID', label: '수량별 부과' },
]

const TAX_TYPES = [
  { value: 'TAX', label: '과세' },
  { value: 'DUTYFREE', label: '면세' },
  { value: 'ZERO', label: '영세' },
]

export default function ProductDetailEditPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const productId = resolvedParams.id
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  const [productData, setProductData] = useState<NaverProductFullDetail | null>(null)
  const [originalData, setOriginalData] = useState<NaverProductFullDetail | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  
  const [suppliers, setSuppliers] = useState<SupplierSimple[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null)
  const [isSavingSupplier, setIsSavingSupplier] = useState(false)

  const [newImageUrl, setNewImageUrl] = useState('')
  const [newOptionRow, setNewOptionRow] = useState<Partial<NaverOptionItem>>({
    optionName1: '',
    stockQuantity: 0,
    price: 0,
  })

  useEffect(() => {
    loadProductDetail()
    loadSuppliers()
  }, [productId])
  
  async function loadSuppliers() {
    const result = await getSuppliersSimple()
    if (result.data) {
      setSuppliers(result.data)
    }
  }
  
  async function handleSupplierChange(supplierId: string | null) {
    setIsSavingSupplier(true)
    try {
      const result = await updateProduct({
        id: productId,
        supplierId: supplierId,
      })
      if (result.success) {
        setSelectedSupplierId(supplierId)
        toast.success('공급업체가 저장되었습니다.')
      } else {
        toast.error(result.error || '공급업체 저장 실패')
      }
    } finally {
      setIsSavingSupplier(false)
    }
  }

  useEffect(() => {
    if (productData && originalData) {
      setHasChanges(JSON.stringify(productData) !== JSON.stringify(originalData))
    }
  }, [productData, originalData])

  async function loadProductDetail() {
    setIsSyncing(true)
    try {
      const result = await getProductDetailFromNaver(productId)

      if (result.data) {
        setProductData(result.data)
        setOriginalData(JSON.parse(JSON.stringify(result.data)))
      } else if (result.error) {
        toast.error(result.error)
      }
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleUpload() {
    if (!hasChanges || !productData) {
      toast.info('변경된 내용이 없습니다.')
      return
    }

    setIsUploading(true)
    try {
      const updateInput: UpdateProductToNaverInput = {
        name: productData.name,
        salePrice: productData.salePrice,
        stockQuantity: productData.stockQuantity,
        detailContent: productData.detailContent,
        sellerManagementCode: productData.sellerManagementCode,
        sellerBarcode: productData.sellerBarcode,
        sellerCustomCode1: productData.sellerCustomCode1,
        sellerCustomCode2: productData.sellerCustomCode2,
        brandName: productData.brandName,
        modelName: productData.modelName,
        manufacturerName: productData.manufacturerName,
        leafCategoryId: productData.leafCategoryId,
        representativeImageUrl: productData.representativeImageUrl,
        optionalImageUrls: productData.optionalImageUrls,
        saleStartDate: productData.saleStartDate,
        saleEndDate: productData.saleEndDate,
        originAreaCode: productData.originAreaCode,
        originArea: productData.originArea,
        importer: productData.importer,
        afterServiceTel: productData.afterServiceTel,
        afterServiceGuide: productData.afterServiceGuide,
        minPurchaseQuantity: productData.minPurchaseQuantity,
        maxPurchaseQuantityPerId: productData.maxPurchaseQuantityPerId,
        maxPurchaseQuantityPerOrder: productData.maxPurchaseQuantityPerOrder,
        deliveryFeeType: productData.deliveryFeeType,
        baseFee: productData.baseFee,
        freeConditionalAmount: productData.freeConditionalAmount,
        returnDeliveryFee: productData.returnDeliveryFee,
        exchangeDeliveryFee: productData.exchangeDeliveryFee,
        taxType: productData.taxType,
        minorPurchasable: productData.minorPurchasable,
        options: productData.options,
        optionGroupNames: productData.optionGroupNames,
        simpleOptions: productData.simpleOptions,
        supplementProducts: productData.supplementProducts,
        productInfoProvidedNotice: productData.productInfoProvidedNotice,
        seoPageTitle: productData.seoPageTitle,
        seoMetaDescription: productData.seoMetaDescription,
        sellerTags: productData.sellerTags,
        discountValue: productData.discountValue,
        discountUnitType: productData.discountUnitType,
        purchasePointValue: productData.purchasePointValue,
        purchasePointUnitType: productData.purchasePointUnitType,
        textReviewPoint: productData.textReviewPoint,
        photoVideoReviewPoint: productData.photoVideoReviewPoint,
        giftName: productData.giftName,
        eventPhraseContent: productData.eventPhraseContent,
        eventPhraseEnabled: productData.eventPhraseEnabled,
      }

      const result = await updateProductDetailToNaver(productId, updateInput)

      if (result.success) {
        toast.success('상품 정보가 스마트스토어에 업로드되었습니다.')
        setOriginalData(JSON.parse(JSON.stringify(productData)))
        setHasChanges(false)
      } else {
        toast.error(result.error || '업로드 실패')
      }
    } finally {
      setIsUploading(false)
    }
  }

  function updateField<K extends keyof NaverProductFullDetail>(
    field: K,
    value: NaverProductFullDetail[K]
  ) {
    if (productData) {
      setProductData({ ...productData, [field]: value })
    }
  }

  function addOptionalImage() {
    if (!newImageUrl || !productData) return
    const currentImages = productData.optionalImageUrls || []
    if (currentImages.length >= 9) {
      toast.error('추가 이미지는 최대 9개까지 등록 가능합니다.')
      return
    }
    updateField('optionalImageUrls', [...currentImages, newImageUrl])
    setNewImageUrl('')
  }

  function removeOptionalImage(index: number) {
    if (!productData?.optionalImageUrls) return
    const newImages = [...productData.optionalImageUrls]
    newImages.splice(index, 1)
    updateField('optionalImageUrls', newImages)
  }

  function addOption() {
    if (!newOptionRow.optionName1 || !productData) return
    const currentOptions = productData.options || []
    updateField('options', [...currentOptions, newOptionRow as NaverOptionItem])
    setNewOptionRow({ optionName1: '', stockQuantity: 0, price: 0 })
  }

  function removeOption(index: number) {
    if (!productData?.options) return
    const newOptions = [...productData.options]
    newOptions.splice(index, 1)
    updateField('options', newOptions)
  }

  function updateOption(index: number, field: keyof NaverOptionItem, value: string | number | boolean) {
    if (!productData?.options) return
    const newOptions = [...productData.options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    updateField('options', newOptions)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      maximumFractionDigits: 0,
    }).format(value)
  }

  function isFieldChanged<K extends keyof NaverProductFullDetail>(field: K): boolean {
    if (!productData || !originalData) return false
    return JSON.stringify(productData[field]) !== JSON.stringify(originalData[field])
  }

  function getFieldStyle(field: keyof NaverProductFullDetail): string {
    return isFieldChanged(field) ? 'ring-2 ring-yellow-500/50 bg-yellow-500/5' : ''
  }

  if (isSyncing && !productData) {
    return (
      <>
        <Header title="상품 편집" subtitle="Product Editor" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">상품 정보 불러오는 중...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="상품 편집" subtitle="Product Editor" />

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {productData && (
            <>
              <Card>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    {productData.representativeImageUrl ? (
                      <Image
                        src={productData.representativeImageUrl}
                        alt={productData.name}
                        width={60}
                        height={60}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-[60px] h-[60px] bg-muted rounded-lg flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-bold">{productData.name}</h2>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{formatCurrency(productData.salePrice)}</span>
                        <span>재고: {productData.stockQuantity}개</span>
                        {productData.categoryName && (
                          <Badge variant="outline" className="text-xs">
                            {productData.categoryName.split('>').pop()?.trim()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        변경됨
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={loadProductDetail} disabled={isSyncing}>
                      {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      새로고침
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/ai-generator?productId=${productId}`)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI 생성
                    </Button>
                    <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" disabled={isUploading || !hasChanges}>
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                          스마트스토어 업로드
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>상품 정보 업로드</DialogTitle>
                          <DialogDescription>
                            수정된 상품 정보를 네이버 스마트스토어에 업로드합니다. 실제 상품 페이지가 변경됩니다.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setShowUploadDialog(false)}>취소</Button>
                          <Button onClick={() => { handleUpload(); setShowUploadDialog(false); }}>업로드</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="lg:hidden mb-4">
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="섹션 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">기본정보</SelectItem>
                      <SelectItem value="images">이미지</SelectItem>
                      <SelectItem value="detail">상세설명</SelectItem>
                      <SelectItem value="options">옵션</SelectItem>
                      <SelectItem value="delivery">배송</SelectItem>
                      <SelectItem value="notice">상품정보고시</SelectItem>
                      <SelectItem value="benefit">혜택</SelectItem>
                      <SelectItem value="seo">SEO</SelectItem>
                      <SelectItem value="service">A/S</SelectItem>
                      <SelectItem value="settings">설정</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="hidden lg:block w-full">
                  <TabsList className="inline-flex h-auto gap-1 bg-muted/50 p-1 w-max">
                    <TabsTrigger value="basic" className="gap-1.5 text-xs whitespace-nowrap">
                      <Package className="h-3.5 w-3.5" />기본정보
                    </TabsTrigger>
                    <TabsTrigger value="images" className="gap-1.5 text-xs whitespace-nowrap">
                      <ImageIcon className="h-3.5 w-3.5" />이미지
                    </TabsTrigger>
                    <TabsTrigger value="detail" className="gap-1.5 text-xs whitespace-nowrap">
                      <Code className="h-3.5 w-3.5" />상세설명
                    </TabsTrigger>
                    <TabsTrigger value="options" className="gap-1.5 text-xs whitespace-nowrap">
                      <Tag className="h-3.5 w-3.5" />옵션
                    </TabsTrigger>
                    <TabsTrigger value="delivery" className="gap-1.5 text-xs whitespace-nowrap">
                      <Truck className="h-3.5 w-3.5" />배송
                    </TabsTrigger>
                    <TabsTrigger value="notice" className="gap-1.5 text-xs whitespace-nowrap">
                      <FileText className="h-3.5 w-3.5" />상품정보고시
                    </TabsTrigger>
                    <TabsTrigger value="benefit" className="gap-1.5 text-xs whitespace-nowrap">
                      <Gift className="h-3.5 w-3.5" />혜택
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="gap-1.5 text-xs whitespace-nowrap">
                      <Search className="h-3.5 w-3.5" />SEO
                    </TabsTrigger>
                    <TabsTrigger value="service" className="gap-1.5 text-xs whitespace-nowrap">
                      <Phone className="h-3.5 w-3.5" />A/S
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="gap-1.5 text-xs whitespace-nowrap">
                      <Settings className="h-3.5 w-3.5" />설정
                    </TabsTrigger>
                  </TabsList>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>

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
                            value={selectedSupplierId || ''} 
                            onValueChange={(v) => handleSupplierChange(v || null)}
                            disabled={isSavingSupplier}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="공급업체를 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">없음</SelectItem>
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

                <TabsContent value="images" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">상품 이미지</CardTitle>
                      <CardDescription>대표 이미지 1장 + 추가 이미지 최대 9장</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label>대표 이미지 URL</Label>
                        <Input value={productData.representativeImageUrl || ''} onChange={(e) => updateField('representativeImageUrl', e.target.value)} placeholder="https://..." />
                        {productData.representativeImageUrl && (
                          <div className="mt-2">
                            <Image src={productData.representativeImageUrl} alt="대표이미지" width={150} height={150} className="rounded-lg object-cover border" />
                          </div>
                        )}
                      </div>
                      <Separator />
                      <div className="space-y-4">
                        <Label>추가 이미지 ({productData.optionalImageUrls?.length || 0}/9)</Label>
                        <div className="flex gap-2">
                          <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="이미지 URL 입력" className="flex-1" />
                          <Button onClick={addOptionalImage} disabled={!newImageUrl}>
                            <Plus className="h-4 w-4 mr-1" />추가
                          </Button>
                        </div>
                        {productData.optionalImageUrls && productData.optionalImageUrls.length > 0 && (
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                            {productData.optionalImageUrls.map((url, index) => (
                              <div key={index} className="relative group">
                                <Image src={url} alt={`추가이미지 ${index + 1}`} width={100} height={100} className="rounded-lg object-cover border w-full aspect-square" />
                                <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeOptionalImage(index)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="detail" className="mt-6">
                  <Card className="min-h-[600px]">
                    <CardHeader className="border-b py-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">상세 설명 (HTML)</CardTitle>
                        <Badge variant="outline">{productData.detailContent?.length || 0}자</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Tabs defaultValue="editor">
                        <div className="border-b px-4">
                          <TabsList className="h-10 bg-transparent">
                            <TabsTrigger value="editor" className="gap-2"><Code className="h-4 w-4" />HTML 편집</TabsTrigger>
                            <TabsTrigger value="preview" className="gap-2"><Eye className="h-4 w-4" />미리보기</TabsTrigger>
                          </TabsList>
                        </div>
                        <TabsContent value="editor" className="p-4 m-0">
                          <Textarea value={productData.detailContent || ''} onChange={(e) => updateField('detailContent', e.target.value)} placeholder="HTML 상세페이지 내용..." className="min-h-[500px] font-mono text-sm" />
                        </TabsContent>
                        <TabsContent value="preview" className="p-4 m-0">
                          <div className="border rounded-lg p-4 bg-white min-h-[500px] overflow-auto">
                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: productData.detailContent || '' }} />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </TabsContent>

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

                <TabsContent value="delivery" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">배송/반품 정보</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>배송비 유형</Label>
                            <Select value={productData.deliveryFeeType || 'PAID'} onValueChange={(v) => updateField('deliveryFeeType', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {DELIVERY_FEE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          {productData.deliveryFeeType !== 'FREE' && (
                            <div className="space-y-2">
                              <Label>기본 배송비</Label>
                              <Input type="number" value={productData.baseFee || 0} onChange={(e) => updateField('baseFee', Number(e.target.value))} />
                            </div>
                          )}
                          {productData.deliveryFeeType === 'CONDITIONAL_FREE' && (
                            <div className="space-y-2">
                              <Label>무료배송 기준금액</Label>
                              <Input type="number" value={productData.freeConditionalAmount || 0} onChange={(e) => updateField('freeConditionalAmount', Number(e.target.value))} />
                            </div>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>반품 배송비 (편도)</Label>
                            <Input type="number" value={productData.returnDeliveryFee || 0} onChange={(e) => updateField('returnDeliveryFee', Number(e.target.value))} />
                          </div>
                          <div className="space-y-2">
                            <Label>교환 배송비 (왕복)</Label>
                            <Input type="number" value={productData.exchangeDeliveryFee || 0} onChange={(e) => updateField('exchangeDeliveryFee', Number(e.target.value))} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notice" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">상품정보제공고시</CardTitle>
                      <CardDescription>상품 유형에 따른 필수 정보</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>상품 유형</Label>
                        <Select value={productData.productInfoProvidedNotice?.productInfoProvidedNoticeType || 'ETC'} onValueChange={(v) => updateField('productInfoProvidedNotice', { ...productData.productInfoProvidedNotice, productInfoProvidedNoticeType: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PRODUCT_INFO_NOTICE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            상품정보제공고시 세부 항목은 상품 유형에 따라 다릅니다. 
                            현재는 스마트스토어 센터에서 직접 수정해주세요.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="benefit" className="mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">할인 설정</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>할인 금액/률</Label>
                            <Input type="number" value={productData.discountValue || 0} onChange={(e) => updateField('discountValue', Number(e.target.value))} />
                          </div>
                          <div className="space-y-2">
                            <Label>단위</Label>
                            <Select value={productData.discountUnitType || 'WON'} onValueChange={(v) => updateField('discountUnitType', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="WON">원</SelectItem>
                                <SelectItem value="PERCENT">%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {productData.discountValue && productData.discountValue > 0 && (
                          <div className="p-3 bg-primary/10 rounded-lg">
                            <p className="text-sm font-medium text-primary">
                              할인 적용가: {formatCurrency(
                                productData.discountUnitType === 'PERCENT' 
                                  ? productData.salePrice * (1 - productData.discountValue / 100)
                                  : productData.salePrice - productData.discountValue
                              )}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">포인트/적립</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>구매 적립</Label>
                            <Input type="number" value={productData.purchasePointValue || 0} onChange={(e) => updateField('purchasePointValue', Number(e.target.value))} />
                          </div>
                          <div className="space-y-2">
                            <Label>단위</Label>
                            <Select value={productData.purchasePointUnitType || 'WON'} onValueChange={(v) => updateField('purchasePointUnitType', v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="WON">원</SelectItem>
                                <SelectItem value="PERCENT">%</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>텍스트 리뷰 포인트</Label>
                            <Input type="number" value={productData.textReviewPoint || 0} onChange={(e) => updateField('textReviewPoint', Number(e.target.value))} />
                          </div>
                          <div className="space-y-2">
                            <Label>포토/동영상 리뷰 포인트</Label>
                            <Input type="number" value={productData.photoVideoReviewPoint || 0} onChange={(e) => updateField('photoVideoReviewPoint', Number(e.target.value))} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">사은품</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Label>사은품명</Label>
                          <Input value={productData.giftName || ''} onChange={(e) => updateField('giftName', e.target.value)} placeholder="구매 시 증정되는 사은품" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">이벤트 문구</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>이벤트 문구 사용</Label>
                          <Switch checked={productData.eventPhraseEnabled || false} onCheckedChange={(checked) => updateField('eventPhraseEnabled', checked)} />
                        </div>
                        {productData.eventPhraseEnabled && (
                          <div className="space-y-2">
                            <Label>문구 내용</Label>
                            <Input value={productData.eventPhraseContent || ''} onChange={(e) => updateField('eventPhraseContent', e.target.value)} placeholder="예: 오늘만 50% 할인!" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">검색 최적화 (SEO)</CardTitle>
                      <CardDescription>네이버 검색 노출을 위한 설정</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>페이지 제목</Label>
                        <Input value={productData.seoPageTitle || ''} onChange={(e) => updateField('seoPageTitle', e.target.value)} placeholder="검색 결과에 표시될 제목" />
                        <p className="text-xs text-muted-foreground">{productData.seoPageTitle?.length || 0}/100자</p>
                      </div>
                      <div className="space-y-2">
                        <Label>메타 설명</Label>
                        <Textarea value={productData.seoMetaDescription || ''} onChange={(e) => updateField('seoMetaDescription', e.target.value)} placeholder="검색 결과에 표시될 설명" className="min-h-[100px]" />
                        <p className="text-xs text-muted-foreground">{productData.seoMetaDescription?.length || 0}/200자</p>
                      </div>
                      <div className="space-y-2">
                        <Label>태그</Label>
                        <div className="flex flex-wrap gap-2">
                          {productData.sellerTags?.map((tag, idx) => (
                            <Badge key={idx} variant="secondary">{tag.text}</Badge>
                          ))}
                          {(!productData.sellerTags || productData.sellerTags.length === 0) && (
                            <p className="text-sm text-muted-foreground">등록된 태그가 없습니다.</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="service" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">A/S 및 고객 서비스</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>A/S 전화번호</Label>
                        <Input value={productData.afterServiceTel || ''} onChange={(e) => updateField('afterServiceTel', e.target.value)} placeholder="02-1234-5678" />
                      </div>
                      <div className="space-y-2">
                        <Label>A/S 안내</Label>
                        <Textarea value={productData.afterServiceGuide || ''} onChange={(e) => updateField('afterServiceGuide', e.target.value)} placeholder="A/S 관련 안내사항..." className="min-h-[150px]" />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">판매 설정</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>부가세</Label>
                          <Select value={productData.taxType || 'TAX'} onValueChange={(v) => updateField('taxType', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TAX_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>미성년자 구매 가능</Label>
                            <p className="text-xs text-muted-foreground">만 19세 미만 구매 허용</p>
                          </div>
                          <Switch checked={productData.minorPurchasable || false} onCheckedChange={(checked) => updateField('minorPurchasable', checked)} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">구매 수량 제한</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>최소 수량</Label>
                            <Input type="number" value={productData.minPurchaseQuantity || ''} onChange={(e) => updateField('minPurchaseQuantity', Number(e.target.value) || undefined)} placeholder="1" />
                          </div>
                          <div className="space-y-2">
                            <Label>1인당 최대</Label>
                            <Input type="number" value={productData.maxPurchaseQuantityPerId || ''} onChange={(e) => updateField('maxPurchaseQuantityPerId', Number(e.target.value) || undefined)} placeholder="무제한" />
                          </div>
                          <div className="space-y-2">
                            <Label>1회 최대</Label>
                            <Input type="number" value={productData.maxPurchaseQuantityPerOrder || ''} onChange={(e) => updateField('maxPurchaseQuantityPerOrder', Number(e.target.value) || undefined)} placeholder="무제한" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">판매 기간</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>시작일</Label>
                            <Input type="date" value={productData.saleStartDate?.split('T')[0] || ''} onChange={(e) => updateField('saleStartDate', e.target.value ? `${e.target.value}T00:00:00` : undefined)} />
                          </div>
                          <div className="space-y-2">
                            <Label>종료일</Label>
                            <Input type="date" value={productData.saleEndDate?.split('T')[0] || ''} onChange={(e) => updateField('saleEndDate', e.target.value ? `${e.target.value}T23:59:59` : undefined)} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </>
  )
}
