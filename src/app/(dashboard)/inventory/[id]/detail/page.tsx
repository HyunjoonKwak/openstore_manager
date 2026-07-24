'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Code,
  Loader2,
  Package,
  Truck,
  Phone,
  Tag,
  ImageIcon,
  Settings,
  Search,
  FileText,
  Gift,
} from 'lucide-react'
import { Header } from '@/components/layouts/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  getProductDetailFromNaver,
  updateProductDetailToNaver,
  type NaverProductFullDetail,
  type UpdateProductToNaverInput,
  type NaverOptionItem,
} from '@/lib/actions/naver-sync'
import { getSuppliersSimple, type SupplierSimple } from '@/lib/actions/suppliers'
import { updateProduct, getProductById } from '@/lib/actions/products'
import { ProductEditorHeader } from './components/ProductEditorHeader'
import { BasicInfoTab } from './components/BasicInfoTab'
import { ImagesTab } from './components/ImagesTab'
import { DetailContentTab } from './components/DetailContentTab'
import { OptionsTab } from './components/OptionsTab'
import { DeliveryTab } from './components/DeliveryTab'
import { NoticeTab } from './components/NoticeTab'
import { BenefitTab } from './components/BenefitTab'
import { SeoTab } from './components/SeoTab'
import { ServiceTab } from './components/ServiceTab'
import { SettingsTab } from './components/SettingsTab'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProductDetailEditPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const productId = resolvedParams.id
  const [isSyncing, setIsSyncing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  const [productData, setProductData] = useState<NaverProductFullDetail | null>(null)
  const [originalData, setOriginalData] = useState<NaverProductFullDetail | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

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
    async function fetchData() {
      setIsSyncing(true)
      setLoadError(null)
      try {
        const result = await getProductDetailFromNaver(productId)
        if (result.data) {
          setProductData(result.data)
          setOriginalData(JSON.parse(JSON.stringify(result.data)))
        } else if (result.error) {
          setLoadError(result.error)
          toast.error(result.error)
        }
      } catch (error) {
        console.error('Failed to load product detail:', error)
        const message = '상품 정보를 불러오는 중 오류가 발생했습니다.'
        setLoadError(message)
        toast.error(message)
      } finally {
        setIsSyncing(false)
      }

      // Suppliers and the linked supplier id live in the local DB, not Naver
      const [supplierResult, localProductResult] = await Promise.all([
        getSuppliersSimple(),
        getProductById(productId),
      ])
      if (supplierResult.data) {
        setSuppliers(supplierResult.data)
      }
      if (localProductResult.data) {
        setSelectedSupplierId(localProductResult.data.supplierId)
      }
    }
    fetchData()
  }, [productId])

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
    setLoadError(null)
    try {
      const result = await getProductDetailFromNaver(productId)
      if (result.data) {
        setProductData(result.data)
        setOriginalData(JSON.parse(JSON.stringify(result.data)))
      } else if (result.error) {
        setLoadError(result.error)
        toast.error(result.error)
      }
    } catch (error) {
      console.error('Failed to load product detail:', error)
      const message = '상품 정보를 불러오는 중 오류가 발생했습니다.'
      setLoadError(message)
      toast.error(message)
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
          {!productData && loadError && (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center text-center gap-4">
                  <AlertTriangle className="h-10 w-10 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="font-medium">상품 정보를 불러올 수 없습니다</p>
                    <p className="text-sm text-muted-foreground">{loadError}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {(loadError.includes('API 키') || loadError.includes('설정')) && (
                      <Button asChild>
                        <Link href="/settings">설정으로 이동</Link>
                      </Button>
                    )}
                    <Button variant="outline" asChild>
                      <Link href="/inventory">상품 목록으로</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {productData && (
            <>
              <ProductEditorHeader
                productData={productData}
                productId={productId}
                hasChanges={hasChanges}
                isSyncing={isSyncing}
                isUploading={isUploading}
                showUploadDialog={showUploadDialog}
                setShowUploadDialog={setShowUploadDialog}
                loadProductDetail={loadProductDetail}
                handleUpload={handleUpload}
                formatCurrency={formatCurrency}
              />

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

                <BasicInfoTab
                  productData={productData}
                  updateField={updateField}
                  isFieldChanged={isFieldChanged}
                  getFieldStyle={getFieldStyle}
                  suppliers={suppliers}
                  selectedSupplierId={selectedSupplierId}
                  isSavingSupplier={isSavingSupplier}
                  handleSupplierChange={handleSupplierChange}
                />

                <ImagesTab
                  productData={productData}
                  updateField={updateField}
                  newImageUrl={newImageUrl}
                  setNewImageUrl={setNewImageUrl}
                  addOptionalImage={addOptionalImage}
                  removeOptionalImage={removeOptionalImage}
                />

                <DetailContentTab productData={productData} updateField={updateField} />

                <OptionsTab
                  productData={productData}
                  updateField={updateField}
                  newOptionRow={newOptionRow}
                  setNewOptionRow={setNewOptionRow}
                  addOption={addOption}
                  removeOption={removeOption}
                  updateOption={updateOption}
                />

                <DeliveryTab productData={productData} updateField={updateField} />

                <NoticeTab productData={productData} updateField={updateField} />

                <BenefitTab
                  productData={productData}
                  updateField={updateField}
                  formatCurrency={formatCurrency}
                />

                <SeoTab productData={productData} updateField={updateField} />

                <ServiceTab productData={productData} updateField={updateField} />

                <SettingsTab productData={productData} updateField={updateField} />
              </Tabs>
            </>
          )}
        </div>
      </div>
    </>
  )
}
