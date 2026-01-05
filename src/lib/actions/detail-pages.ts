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
  features: string[]
  description: string
  keywords: string
  category: string
  tone: string
}

export async function saveDetailPage(
  input: SaveDetailPageInput
): Promise<{ data: DetailPageItem | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const contentHtml = `
<div class="product-detail">
  <h1>${input.title}</h1>
  <ul class="features">
    ${input.features.map((f) => `<li>${f}</li>`).join('\n    ')}
  </ul>
  <div class="description">
    <p>${input.description}</p>
  </div>
</div>
  `.trim()

  const userInputs = {
    keywords: input.keywords,
    category: input.category,
    tone: input.tone,
    features: input.features,
    description: input.description,
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

  revalidatePath('/ai-generator')

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

  revalidatePath('/ai-generator')
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
