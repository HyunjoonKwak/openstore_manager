'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseError, formatErrorMessage } from '@/lib/error-messages'

export interface ProductWithSupplier {
  id: string
  name: string
  price: number
  stockQuantity: number
  sku: string | null
  supplierId: string | null
  supplierName: string | null
  storeId: string
  status: string | null
  platformProductId: string | null
  imageUrl: string | null
  category: string | null
  brand: string | null
  createdAt: string
}

interface ProductRow {
  id: string
  name: string
  price: number
  stock_quantity: number
  sku: string | null
  supplier_id: string | null
  store_id: string
  status: string | null
  platform_product_id: string | null
  image_url: string | null
  category: string | null
  brand: string | null
  created_at: string
  suppliers: { name: string } | null
}

export async function getProducts(): Promise<{ data: ProductWithSupplier[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)

  if (!stores || stores.length === 0) {
    return { data: [], error: null }
  }

  const storeIds = stores.map((s) => s.id)

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      stock_quantity,
      sku,
      supplier_id,
      store_id,
      status,
      platform_product_id,
      image_url,
      category,
      brand,
      created_at,
      suppliers (name)
    `)
    .in('store_id', storeIds)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: formatErrorMessage(parseError(error, 'product', 'fetch')) }
  }

  const typedProducts = products as unknown as ProductRow[]

  const transformedProducts: ProductWithSupplier[] = typedProducts.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    stockQuantity: product.stock_quantity,
    sku: product.sku,
    supplierId: product.supplier_id,
    supplierName: product.suppliers?.name || null,
    storeId: product.store_id,
    status: product.status,
    platformProductId: product.platform_product_id,
    imageUrl: product.image_url,
    category: product.category,
    brand: product.brand,
    createdAt: product.created_at,
  }))

  return { data: transformedProducts, error: null }
}

export async function getProductStats(): Promise<{
  data: {
    totalProducts: number
    lowStock: number
    outOfStock: number
    healthy: number
  } | null
  error: string | null
}> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: stores } = await supabase
    .from('stores')
    .select('id')
    .eq('user_id', userData.user.id)

  if (!stores || stores.length === 0) {
    return {
      data: { totalProducts: 0, lowStock: 0, outOfStock: 0, healthy: 0 },
      error: null,
    }
  }

  const storeIds = stores.map((s) => s.id)

  const { data: products } = await supabase
    .from('products')
    .select('stock_quantity')
    .in('store_id', storeIds)

  if (!products) {
    return {
      data: { totalProducts: 0, lowStock: 0, outOfStock: 0, healthy: 0 },
      error: null,
    }
  }

  const typedProducts = products as unknown as { stock_quantity: number }[]
  const totalProducts = typedProducts.length
  const outOfStock = typedProducts.filter((p) => p.stock_quantity === 0).length
  const lowStock = typedProducts.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= 10).length
  const healthy = totalProducts - outOfStock - lowStock

  return {
    data: { totalProducts, lowStock, outOfStock, healthy },
    error: null,
  }
}

interface CreateProductInput {
  storeId: string
  name: string
  price: number
  stockQuantity?: number
  sku?: string
  supplierId?: string
}

export async function createProduct(
  input: CreateProductInput
): Promise<{ data: ProductWithSupplier | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .insert({
      store_id: input.storeId,
      name: input.name,
      price: input.price,
      stock_quantity: input.stockQuantity || 0,
      sku: input.sku || null,
      supplier_id: input.supplierId || null,
    })
    .select(`
      id,
      name,
      price,
      stock_quantity,
      sku,
      supplier_id,
      store_id,
      created_at,
      suppliers (name)
    `)
    .single()

  if (error) {
    return { data: null, error: formatErrorMessage(parseError(error, 'product', 'create')) }
  }

  const typedData = data as unknown as ProductRow

  revalidatePath('/inventory')

  return {
    data: {
      id: typedData.id,
      name: typedData.name,
      price: typedData.price,
      stockQuantity: typedData.stock_quantity,
      sku: typedData.sku,
      supplierId: typedData.supplier_id,
      supplierName: typedData.suppliers?.name || null,
      storeId: typedData.store_id,
      status: null,
      platformProductId: null,
      imageUrl: null,
      category: null,
      brand: null,
      createdAt: typedData.created_at,
    },
    error: null,
  }
}

interface UpdateProductInput {
  id: string
  name?: string
  price?: number
  stockQuantity?: number
  sku?: string
  supplierId?: string | null
}

export async function updateProduct(
  input: UpdateProductInput
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const updateData: Record<string, string | number | null> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.price !== undefined) updateData.price = input.price
  if (input.stockQuantity !== undefined) updateData.stock_quantity = input.stockQuantity
  if (input.sku !== undefined) updateData.sku = input.sku
  if (input.supplierId !== undefined) updateData.supplier_id = input.supplierId

  const { error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', input.id)

  if (error) {
    return { success: false, error: formatErrorMessage(parseError(error, 'product', 'update')) }
  }

  revalidatePath('/inventory')
  return { success: true, error: null }
}

export async function updateStock(
  productId: string,
  quantity: number
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ stock_quantity: quantity })
    .eq('id', productId)

  if (error) {
    return { success: false, error: formatErrorMessage(parseError(error, 'product', 'update')) }
  }

  revalidatePath('/inventory')
  return { success: true, error: null }
}

export async function deleteProduct(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: formatErrorMessage(parseError(error, 'product', 'delete')) }
  }

  revalidatePath('/inventory')
  return { success: true, error: null }
}

export interface LocalProductDetail {
  id: string
  name: string
  price: number
  stockQuantity: number
  sku: string | null
  supplierId: string | null
  supplierName: string | null
  storeId: string
  status: string | null
  platformProductId: string | null
  imageUrl: string | null
  category: string | null
  brand: string | null
  description: string | null
  createdAt: string
  isNaverLinked: boolean
}

export async function getProductById(
  productId: string
): Promise<{ data: LocalProductDetail | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  interface ProductDetailRow {
    id: string
    name: string
    price: number
    stock_quantity: number
    sku: string | null
    supplier_id: string | null
    store_id: string
    status: string | null
    platform_product_id: string | null
    image_url: string | null
    category: string | null
    brand: string | null
    description: string | null
    created_at: string
    suppliers: { name: string } | null
  }

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      price,
      stock_quantity,
      sku,
      supplier_id,
      store_id,
      status,
      platform_product_id,
      image_url,
      category,
      brand,
      description,
      created_at,
      suppliers (name)
    `)
    .eq('id', productId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const typedProduct = product as unknown as ProductDetailRow

  return {
    data: {
      id: typedProduct.id,
      name: typedProduct.name,
      price: typedProduct.price,
      stockQuantity: typedProduct.stock_quantity,
      sku: typedProduct.sku,
      supplierId: typedProduct.supplier_id,
      supplierName: typedProduct.suppliers?.name || null,
      storeId: typedProduct.store_id,
      status: typedProduct.status,
      platformProductId: typedProduct.platform_product_id,
      imageUrl: typedProduct.image_url,
      category: typedProduct.category,
      brand: typedProduct.brand,
      description: typedProduct.description,
      createdAt: typedProduct.created_at,
      isNaverLinked: !!typedProduct.platform_product_id,
    },
    error: null,
  }
}

export interface UpdateProductDetailInput {
  id: string
  name?: string
  price?: number
  stockQuantity?: number
  sku?: string
  supplierId?: string | null
  imageUrl?: string | null
  category?: string | null
  brand?: string | null
  description?: string | null
}

export async function updateProductDetail(
  input: UpdateProductDetailInput
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const updateData: Record<string, string | number | null> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.price !== undefined) updateData.price = input.price
  if (input.stockQuantity !== undefined) updateData.stock_quantity = input.stockQuantity
  if (input.sku !== undefined) updateData.sku = input.sku
  if (input.supplierId !== undefined) updateData.supplier_id = input.supplierId
  if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl
  if (input.category !== undefined) updateData.category = input.category
  if (input.brand !== undefined) updateData.brand = input.brand
  if (input.description !== undefined) updateData.description = input.description

  const { error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', input.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/inventory')
  revalidatePath(`/inventory/${input.id}/detail`)
  return { success: true, error: null }
}

export async function getUserStores(): Promise<{ data: { id: string; storeName: string }[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, store_name')
    .eq('user_id', userData.user.id)

  if (error) {
    return { data: null, error: error.message }
  }

  const typedStores = stores as unknown as { id: string; store_name: string }[]

  return {
    data: typedStores.map((s) => ({ id: s.id, storeName: s.store_name })),
    error: null,
  }
}
