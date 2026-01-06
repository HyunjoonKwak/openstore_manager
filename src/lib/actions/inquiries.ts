'use server'

import { createClient } from '@/lib/supabase/server'
import { NaverCommerceClient, type NaverInquiry, type NaverQna } from '@/lib/naver/client'
import type { Json } from '@/types/database.types'

interface NaverApiConfig {
  naverClientId?: string
  naverClientSecret?: string
}

async function getNaverClient() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  
  if (!userData.user) {
    return { client: null, error: 'Unauthorized' }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('api_config')
    .eq('user_id', userData.user.id)
    .single()

  if (!store) {
    return { client: null, error: 'Store not found' }
  }

  const config = (store.api_config || {}) as NaverApiConfig
  if (!config.naverClientId || !config.naverClientSecret) {
    return { client: null, error: 'API credentials not configured' }
  }

  const client = new NaverCommerceClient({
    clientId: config.naverClientId,
    clientSecret: config.naverClientSecret,
  })

  return { client, error: null }
}

export interface InquiryItem {
  id: string
  type: 'inquiry' | 'qna'
  category?: string
  title?: string
  content: string
  answer?: string
  answered: boolean
  productName?: string
  orderId?: string
  customerId: string
  createdDate: string
  answeredDate?: string
}

export interface InquiryStats {
  totalInquiries: number
  unansweredInquiries: number
  totalQnas: number
  unansweredQnas: number
}

export async function getInquiryStats(): Promise<{
  data: InquiryStats | null
  error: string | null
}> {
  const { client, error } = await getNaverClient()
  
  if (error || !client) {
    return {
      data: { totalInquiries: 0, unansweredInquiries: 0, totalQnas: 0, unansweredQnas: 0 },
      error: null,
    }
  }

  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const formatDate = (date: Date) => date.toISOString().split('T')[0]
  const formatDateTime = (date: Date) => date.toISOString()

  try {
    const [inquiriesResult, unansweredInquiriesResult, qnasResult, unansweredQnasResult] = await Promise.all([
      client.getCustomerInquiries({
        startSearchDate: formatDate(thirtyDaysAgo),
        endSearchDate: formatDate(today),
        size: 10,
      }).catch(() => ({ totalElements: 0 })),
      client.getCustomerInquiries({
        startSearchDate: formatDate(thirtyDaysAgo),
        endSearchDate: formatDate(today),
        answered: false,
        size: 10,
      }).catch(() => ({ totalElements: 0 })),
      client.getProductQnas({
        fromDate: formatDateTime(thirtyDaysAgo),
        toDate: formatDateTime(today),
        size: 10,
      }).catch(() => ({ totalElements: 0 })),
      client.getProductQnas({
        fromDate: formatDateTime(thirtyDaysAgo),
        toDate: formatDateTime(today),
        answered: false,
        size: 10,
      }).catch(() => ({ totalElements: 0 })),
    ])

    return {
      data: {
        totalInquiries: inquiriesResult.totalElements || 0,
        unansweredInquiries: unansweredInquiriesResult.totalElements || 0,
        totalQnas: qnasResult.totalElements || 0,
        unansweredQnas: unansweredQnasResult.totalElements || 0,
      },
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch inquiry stats'
    return { data: null, error: message }
  }
}

export async function getRecentInquiries(limit: number = 10): Promise<{
  data: InquiryItem[] | null
  error: string | null
}> {
  const { client, error } = await getNaverClient()
  
  if (error || !client) {
    return { data: [], error: null }
  }

  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const formatDate = (date: Date) => date.toISOString().split('T')[0]
  const formatDateTime = (date: Date) => date.toISOString()

  try {
    const [inquiriesResult, qnasResult] = await Promise.all([
      client.getCustomerInquiries({
        startSearchDate: formatDate(thirtyDaysAgo),
        endSearchDate: formatDate(today),
        size: limit,
      }).catch(() => ({ contents: [] })),
      client.getProductQnas({
        fromDate: formatDateTime(thirtyDaysAgo),
        toDate: formatDateTime(today),
        size: limit,
      }).catch(() => ({ contents: [] })),
    ])

    const inquiries: InquiryItem[] = (inquiriesResult.contents || []).map((item: NaverInquiry) => ({
      id: item.inquiryNo,
      type: 'inquiry' as const,
      category: item.category,
      title: item.title,
      content: item.inquiryContent,
      answer: item.answerContent,
      answered: item.answered,
      productName: item.productName,
      orderId: item.orderId,
      customerId: item.customerId,
      createdDate: item.createdDate,
      answeredDate: item.answeredDate,
    }))

    const qnas: InquiryItem[] = (qnasResult.contents || []).map((item: NaverQna) => ({
      id: item.questionId,
      type: 'qna' as const,
      content: item.question,
      answer: item.answer,
      answered: item.answered,
      productName: item.productName,
      customerId: item.maskedWriterId,
      createdDate: item.createdDate,
      answeredDate: item.answeredDate,
    }))

    const combined = [...inquiries, ...qnas]
      .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())
      .slice(0, limit)

    return { data: combined, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch inquiries'
    return { data: null, error: message }
  }
}

export async function getUnansweredInquiries(): Promise<{
  data: InquiryItem[] | null
  error: string | null
}> {
  const { client, error } = await getNaverClient()
  
  if (error || !client) {
    return { data: [], error: null }
  }

  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const formatDate = (date: Date) => date.toISOString().split('T')[0]
  const formatDateTime = (date: Date) => date.toISOString()

  try {
    const [inquiriesResult, qnasResult] = await Promise.all([
      client.getCustomerInquiries({
        startSearchDate: formatDate(thirtyDaysAgo),
        endSearchDate: formatDate(today),
        answered: false,
        size: 100,
      }).catch(() => ({ contents: [] })),
      client.getProductQnas({
        fromDate: formatDateTime(thirtyDaysAgo),
        toDate: formatDateTime(today),
        answered: false,
        size: 100,
      }).catch(() => ({ contents: [] })),
    ])

    const inquiries: InquiryItem[] = (inquiriesResult.contents || []).map((item: NaverInquiry) => ({
      id: item.inquiryNo,
      type: 'inquiry' as const,
      category: item.category,
      title: item.title,
      content: item.inquiryContent,
      answered: false,
      productName: item.productName,
      orderId: item.orderId,
      customerId: item.customerId,
      createdDate: item.createdDate,
    }))

    const qnas: InquiryItem[] = (qnasResult.contents || []).map((item: NaverQna) => ({
      id: item.questionId,
      type: 'qna' as const,
      content: item.question,
      answered: false,
      productName: item.productName,
      customerId: item.maskedWriterId,
      createdDate: item.createdDate,
    }))

    const combined = [...inquiries, ...qnas]
      .sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime())

    return { data: combined, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch unanswered inquiries'
    return { data: null, error: message }
  }
}
