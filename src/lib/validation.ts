import { z } from 'zod'
import type { Json } from '@/types/database.types'

// ---------------------------------------------------------------------------
// Common primitives
// ---------------------------------------------------------------------------

// Generic identifier: platform ids (e.g. Naver order ids) are not UUIDs,
// so only require a bounded non-empty string.
export const idSchema = z.string().trim().min(1).max(100)

export const nameSchema = z.string().trim().min(1).max(200)
export const shortTextSchema = z.string().trim().max(200)
export const urlTextSchema = z.string().trim().max(2000)
export const longTextSchema = z.string().max(50000)

export const priceSchema = z.number().int().min(0)
export const quantitySchema = z.number().int().min(0)
export const paginationLimitSchema = z.number().int().min(1).max(100)

export const orderStatusSchema = z.enum([
  'New',
  'Ordered',
  'Dispatched',
  'Delivering',
  'Delivered',
  'Confirmed',
  'CancelRequested',
  'Cancelled',
  'ReturnRequested',
  'Returned',
  'ExchangeRequested',
  'Exchanged',
])
export const contactMethodSchema = z.enum(['SMS', 'Kakao', 'Telegram', 'Discord'])
export const syncTypeSchema = z.enum(['orders', 'products', 'both'])
export const benchmarkSessionStatusSchema = z.enum(['active', 'archived'])
export const benchmarkAssetTypeSchema = z.enum(['image', 'screenshot', 'text'])

// Accept any JSON-serializable value; reject only undefined.
export const jsonValueSchema = z.custom<Json>((value) => value !== undefined)

export const orderIdsSchema = z.array(idSchema).max(1000)

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export const createProductSchema = z.object({
  storeId: idSchema,
  name: nameSchema,
  price: priceSchema,
  stockQuantity: quantitySchema.optional(),
  sku: z.string().trim().max(100).optional(),
  supplierId: idSchema.optional(),
})

export const updateProductSchema = z.object({
  id: idSchema,
  name: nameSchema.optional(),
  price: priceSchema.optional(),
  stockQuantity: quantitySchema.optional(),
  sku: z.string().trim().max(100).optional(),
  supplierId: idSchema.nullable().optional(),
})

export const updateStockSchema = z.object({
  productId: idSchema,
  quantity: quantitySchema,
})

export const updateProductDetailSchema = updateProductSchema.extend({
  imageUrl: urlTextSchema.nullable().optional(),
  category: shortTextSchema.nullable().optional(),
  brand: shortTextSchema.nullable().optional(),
  description: longTextSchema.nullable().optional(),
})

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const updateOrderStatusSchema = z.object({
  orderId: idSchema,
  status: orderStatusSchema,
  syncToNaver: z.boolean().optional(),
})

export const updateTrackingNumberSchema = z.object({
  orderId: idSchema,
  trackingNumber: z.string().trim().min(1).max(50),
  courierCode: z.string().trim().min(1).max(50),
  syncToNaver: z.boolean().optional(),
})

export const createOrderSchema = z.object({
  storeId: idSchema,
  productId: idSchema,
  quantity: quantitySchema,
  customerName: nameSchema,
  customerAddress: z.string().trim().max(2000).optional(),
  platformOrderId: idSchema.optional(),
})

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export const createSupplierSchema = z.object({
  name: nameSchema,
  contactNumber: z.string().trim().max(50).optional(),
  contactMethod: contactMethodSchema,
  webhookUrl: urlTextSchema.optional(),
})

export const updateSupplierSchema = z.object({
  id: idSchema,
  name: nameSchema.optional(),
  contactNumber: z.string().trim().max(50).optional(),
  contactMethod: contactMethodSchema.optional(),
  webhookUrl: urlTextSchema.nullable().optional(),
  messageTemplate: longTextSchema.nullable().optional(),
  sendScheduleTime: z.string().trim().max(20).nullable().optional(),
  sendScheduleEnabled: z.boolean().optional(),
  autoSendEnabled: z.boolean().optional(),
  courierId: idSchema.nullable().optional(),
  defaultCourierAccount: shortTextSchema.nullable().optional(),
})

// ---------------------------------------------------------------------------
// Couriers
// ---------------------------------------------------------------------------

export const createCourierSchema = z.object({
  name: nameSchema,
  code: z.string().trim().min(1).max(50),
  apiType: z.string().trim().max(50).optional(),
  apiConfig: jsonValueSchema.optional(),
  isDefault: z.boolean().optional(),
})

export const updateCourierSchema = z.object({
  id: idSchema,
  name: nameSchema.optional(),
  code: z.string().trim().min(1).max(50).optional(),
  apiType: z.string().trim().max(50).nullable().optional(),
  apiConfig: jsonValueSchema.optional(),
  isDefault: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Detail pages
// ---------------------------------------------------------------------------

export const saveDetailPageSchema = z.object({
  title: z.string().trim().min(1).max(200),
  heroKicker: z.string().max(500),
  targetAudience: z.string().max(2000),
  problemTitle: z.string().max(500),
  problemBody: longTextSchema,
  features: z.array(z.string().max(2000)).max(50),
  comparisonTitle: z.string().max(500),
  comparisonBody: longTextSchema,
  proofTitle: z.string().max(500),
  proofBody: longTextSchema,
  faq: z
    .array(z.object({ question: z.string().max(2000), answer: longTextSchema }))
    .max(50),
  ctaText: z.string().max(1000),
  description: longTextSchema,
  keywords: z.string().max(2000),
  category: z.string().max(200),
  tone: z.string().max(100),
  sectionOrder: z.array(z.string().max(50)).max(20),
  hiddenSections: z.array(z.string().max(50)).max(20),
  benchmarkSessionId: idSchema.optional(),
})

export const searchQuerySchema = z.string().max(200)

// ---------------------------------------------------------------------------
// Benchmark
// ---------------------------------------------------------------------------

export const createBenchmarkSessionSchema = z.object({
  title: nameSchema,
  description: longTextSchema.optional(),
  myProductId: idSchema.optional(),
  myPageUrl: urlTextSchema.optional(),
})

export const updateBenchmarkSessionSchema = z.object({
  sessionId: idSchema,
  title: nameSchema.optional(),
  description: longTextSchema.optional(),
  myProductId: idSchema.optional(),
  myPageUrl: urlTextSchema.optional(),
  status: benchmarkSessionStatusSchema.optional(),
})

export const addBenchmarkPageSchema = z.object({
  sessionId: idSchema,
  url: z.string().trim().min(1).max(2000),
  title: z.string().trim().max(500).optional(),
  platform: z.string().trim().max(50).optional(),
})

export const updateBenchmarkPageSchema = z.object({
  pageId: idSchema,
  title: z.string().trim().max(500).optional(),
  scrollPosition: z.number().min(0).optional(),
})

export const deleteBenchmarkPageSchema = z.object({
  pageId: idSchema,
  sessionId: idSchema,
})

export const addBenchmarkMemoSchema = z.object({
  sessionId: idSchema,
  pageId: idSchema.optional(),
  isMyPage: z.boolean().optional(),
  content: z.string().min(1).max(50000),
  scrollPosition: z.number().min(0).optional(),
  color: z.string().trim().max(50).optional(),
})

export const updateBenchmarkMemoSchema = z.object({
  memoId: idSchema,
  content: z.string().min(1).max(50000).optional(),
  color: z.string().trim().max(50).optional(),
})

export const deleteBenchmarkMemoSchema = z.object({
  memoId: idSchema,
  sessionId: idSchema,
})

export const addBenchmarkChecklistSchema = z.object({
  sessionId: idSchema,
  content: z.string().min(1).max(50000),
  referenceImageUrl: urlTextSchema.optional(),
  priority: z.number().int().min(0).optional(),
})

export const updateBenchmarkChecklistSchema = z.object({
  checklistId: idSchema,
  content: z.string().min(1).max(50000).optional(),
  isCompleted: z.boolean().optional(),
  referenceImageUrl: urlTextSchema.optional(),
  priority: z.number().int().min(0).optional(),
})

export const deleteBenchmarkChecklistSchema = z.object({
  checklistId: idSchema,
  sessionId: idSchema,
})

export const addBenchmarkAssetSchema = z.object({
  sessionId: idSchema,
  pageId: idSchema.optional(),
  assetType: benchmarkAssetTypeSchema,
  url: urlTextSchema.optional(),
  content: longTextSchema.optional(),
  filename: z.string().trim().max(300).optional(),
  memo: longTextSchema.optional(),
})

export const deleteBenchmarkAssetSchema = z.object({
  assetId: idSchema,
  sessionId: idSchema,
})

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export const createAnalysisLogSchema = z.object({
  targetUrl: z.string().trim().min(1).max(2000),
  targetPlatform: z.string().trim().min(1).max(100),
})

export const updateAnalysisLogSchema = z.object({
  id: idSchema,
  analysisResult: jsonValueSchema,
  status: z.enum(['completed', 'failed']),
})

// ---------------------------------------------------------------------------
// Supplier orders
// ---------------------------------------------------------------------------

export const getOrdersBySupplierSchema = z.object({
  supplierId: idSchema,
  status: orderStatusSchema,
})

export const sendOrdersToSupplierSchema = z.object({
  supplierId: idSchema,
  orderIds: orderIdsSchema,
  sendNotification: z.boolean().optional(),
})

// ---------------------------------------------------------------------------
// Sync schedules
// ---------------------------------------------------------------------------

export const createOrUpdateSyncScheduleSchema = z.object({
  storeId: idSchema,
  syncType: syncTypeSchema,
  intervalMinutes: z.number().int().min(1).max(10080),
  isEnabled: z.boolean(),
  syncAtMinute: z.union([z.literal(0), z.literal(30)]).optional(),
  syncTime: z
    .string()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/)
    .optional(),
})

export const toggleSyncScheduleSchema = z.object({
  scheduleId: idSchema,
  isEnabled: z.boolean(),
})

export const getSyncLogsSchema = z.object({
  scheduleId: idSchema,
  limit: paginationLimitSchema,
})

export const createSyncLogSchema = z.object({
  scheduleId: idSchema,
  syncType: z.string().trim().min(1).max(50),
})

export const completeSyncLogSchema = z.object({
  logId: idSchema,
  status: z.enum(['success', 'failed']),
  itemsSynced: z.number().int().min(0),
  errorMessage: longTextSchema.optional(),
})

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

export const dispatchTrackingUpdateSchema = z.object({
  orderId: idSchema,
  trackingNumber: z.string().trim().min(1).max(50),
  courierCode: z.string().trim().min(1).max(50),
})

export const bulkTrackingUpdatesSchema = z.array(dispatchTrackingUpdateSchema).max(1000)

export const testOrderCountSchema = z.number().int().min(1).max(100)

export const trackingExcelRowSchema = z.object({
  platformOrderId: z.string().min(1).max(100),
  trackingNumber: z.string().min(1).max(100),
})

// ---------------------------------------------------------------------------
// Excel upload rows
// ---------------------------------------------------------------------------

// Numeric cells may arrive as strings, so coerce like the previous Number() calls.
export const excelProductRowSchema = z.object({
  name: z.string().trim().min(1).max(200),
  price: z.coerce.number().positive(),
  stock_quantity: z.coerce.number().min(0),
  sku: z.string().max(100).optional(),
})

export const excelOrderRowSchema = z.object({
  platform_order_id: z.string().trim().max(100).optional(),
  customer_name: z.string().trim().min(1).max(200),
  customer_address: z.string().max(2000).optional(),
  quantity: z.coerce.number().int().min(0),
})

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export type ValidationResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

/**
 * Parses input with the given schema. On failure returns a concise Korean
 * message naming the first invalid field instead of throwing a ZodError.
 */
export function validateInput<T>(schema: z.ZodType<T>, input: unknown): ValidationResult<T> {
  const result = schema.safeParse(input)

  if (result.success) {
    return { data: result.data, error: null }
  }

  const issue = result.error.issues[0]
  const field = issue && issue.path.length > 0 ? issue.path.map(String).join('.') : ''

  return {
    data: null,
    error: field ? `입력값이 올바르지 않습니다: ${field}` : '입력값이 올바르지 않습니다.',
  }
}
