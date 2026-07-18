'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { DetailPageStatus, Json } from '@/types/database.types'

export interface DetailPageItem {
  id: string
  title: string
  contentHtml: string | null
  userInputs: {
    keywords?: string
    category?: string
    tone?: string
    features?: string[]
    description?: string
    benchmarkSessionId?: string
    sectionOrder?: string[]
    hiddenSections?: string[]
  }
  status: DetailPageStatus
  createdAt: string
}

interface DetailPageRow {
  id: string
  title: string
  content_html: string | null
  user_inputs: Json
  status: string
  created_at: string
}

export async function getDetailPages(): Promise<{ data: DetailPageItem[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: pages, error } = await supabase
    .from('detail_pages')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  const typedPages = pages as unknown as DetailPageRow[]

  const transformedPages: DetailPageItem[] = typedPages.map((page) => ({
    id: page.id,
    title: page.title,
    contentHtml: page.content_html,
    userInputs: (page.user_inputs || {}) as DetailPageItem['userInputs'],
    status: page.status as DetailPageStatus,
    createdAt: page.created_at,
  }))

  return { data: transformedPages, error: null }
}

interface SaveDetailPageInput {
  title: string
  heroKicker: string
  targetAudience: string
  problemTitle: string
  problemBody: string
  features: string[]
  comparisonTitle: string
  comparisonBody: string
  proofTitle: string
  proofBody: string
  faq: Array<{ question: string; answer: string }>
  ctaText: string
  description: string
  keywords: string
  category: string
  tone: string
  sectionOrder: string[]
  hiddenSections: string[]
  benchmarkSessionId?: string
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character)
}

function buildDetailHtml(input: SaveDetailPageInput): string {
  const sections: Record<string, string> = {
    hero: `<section style="padding:72px 40px;text-align:center;background:#eef2ff"><p style="font-weight:700;color:#4f46e5">${escapeHtml(input.heroKicker)}</p><h1 style="font-size:44px;line-height:1.2;margin:14px 0">${escapeHtml(input.title)}</h1><p style="font-size:18px;line-height:1.7">${escapeHtml(input.targetAudience)}</p></section>`,
    problem: `<section style="padding:64px 40px;background:#f8fafc"><h2 style="font-size:32px">${escapeHtml(input.problemTitle)}</h2><p style="line-height:1.8">${escapeHtml(input.problemBody)}</p></section>`,
    features: `<section style="padding:64px 40px"><h2 style="font-size:32px">핵심 장점</h2>${input.features.map((feature, index) => `<div style="border-top:1px solid #e2e8f0;padding:24px 0"><b style="color:#4f46e5">0${index + 1}</b><h3>${escapeHtml(feature)}</h3></div>`).join('')}</section>`,
    comparison: `<section style="padding:64px 40px;background:#0f172a;color:#fff"><h2 style="font-size:32px">${escapeHtml(input.comparisonTitle)}</h2><p style="line-height:1.8;color:#cbd5e1">${escapeHtml(input.comparisonBody)}</p></section>`,
    proof: `<section style="padding:64px 40px;background:#eef2ff"><h2 style="font-size:32px">${escapeHtml(input.proofTitle)}</h2><p style="line-height:1.8">${escapeHtml(input.proofBody)}</p></section>`,
    faq: `<section style="padding:64px 40px"><h2 style="font-size:32px">자주 묻는 질문</h2>${input.faq.map((item) => `<div style="border-top:1px solid #e2e8f0;padding:20px 0"><b>Q. ${escapeHtml(item.question)}</b><p style="line-height:1.7">${escapeHtml(item.answer)}</p></div>`).join('')}</section>`,
    cta: `<section style="padding:56px 40px;text-align:center;background:#4f46e5;color:#fff"><p style="font-size:20px;font-weight:700">${escapeHtml(input.ctaText)}</p><h2>${escapeHtml(input.title)}</h2></section>`,
  }

  const visible = input.sectionOrder
    .filter((section) => !input.hiddenSections.includes(section))
    .map((section) => sections[section] || '')
    .join('')

  return `<div style="max-width:860px;margin:0 auto;font-family:Arial,'Apple SD Gothic Neo',sans-serif;color:#0f172a">${visible}</div>`
}

export async function saveDetailPage(
  input: SaveDetailPageInput
): Promise<{ data: DetailPageItem | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const contentHtml = buildDetailHtml(input)

  const userInputs = {
    keywords: input.keywords,
    category: input.category,
    tone: input.tone,
    features: input.features,
    description: input.description,
    benchmarkSessionId: input.benchmarkSessionId,
    sectionOrder: input.sectionOrder,
    hiddenSections: input.hiddenSections,
  }

  const { data, error } = await supabase
    .from('detail_pages')
    .insert({
      user_id: userData.user.id,
      title: input.title,
      content_html: contentHtml,
      user_inputs: userInputs,
      status: 'Completed' as DetailPageStatus,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const typedData = data as unknown as DetailPageRow

  revalidatePath('/benchmarking')
  if (input.benchmarkSessionId) {
    revalidatePath(`/benchmarking/${input.benchmarkSessionId}`)
  }

  return {
    data: {
      id: typedData.id,
      title: typedData.title,
      contentHtml: typedData.content_html,
      userInputs: (typedData.user_inputs || {}) as DetailPageItem['userInputs'],
      status: typedData.status as DetailPageStatus,
      createdAt: typedData.created_at,
    },
    error: null,
  }
}

export async function deleteDetailPage(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('detail_pages')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/benchmarking')
  return { success: true, error: null }
}

export async function searchDetailPages(
  query: string
): Promise<{ data: DetailPageItem[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const searchTerm = `%${query}%`

  const { data: pages, error } = await supabase
    .from('detail_pages')
    .select('*')
    .eq('user_id', userData.user.id)
    .or(`title.ilike.${searchTerm},content_html.ilike.${searchTerm}`)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  const typedPages = pages as unknown as DetailPageRow[]

  const transformedPages: DetailPageItem[] = typedPages.map((page) => ({
    id: page.id,
    title: page.title,
    contentHtml: page.content_html,
    userInputs: (page.user_inputs || {}) as DetailPageItem['userInputs'],
    status: page.status as DetailPageStatus,
    createdAt: page.created_at,
  }))

  return { data: transformedPages, error: null }
}
