'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContactMethod } from '@/types/database.types'

export interface SupplierWithStats {
  id: string
  name: string
  contactNumber: string | null
  contactMethod: ContactMethod
  productCount: number
  lastOrderDate: string | null
  createdAt: string
}

interface SupplierRow {
  id: string
  name: string
  contact_number: string | null
  contact_method: string
  created_at: string
}

export async function getSuppliers(): Promise<{ data: SupplierWithStats[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }

  const typedSuppliers = suppliers as unknown as SupplierRow[]

  const { data: productCounts } = await supabase
    .from('products')
    .select('supplier_id')
    .in('supplier_id', typedSuppliers.map((s) => s.id))

  const countMap = new Map<string, number>()
  ;(productCounts || []).forEach((p) => {
    const supplierId = (p as { supplier_id: string | null }).supplier_id
    if (supplierId) {
      countMap.set(supplierId, (countMap.get(supplierId) || 0) + 1)
    }
  })

  const transformedSuppliers: SupplierWithStats[] = typedSuppliers.map((supplier) => ({
    id: supplier.id,
    name: supplier.name,
    contactNumber: supplier.contact_number,
    contactMethod: supplier.contact_method as ContactMethod,
    productCount: countMap.get(supplier.id) || 0,
    lastOrderDate: null,
    createdAt: supplier.created_at,
  }))

  return { data: transformedSuppliers, error: null }
}

interface CreateSupplierInput {
  name: string
  contactNumber?: string
  contactMethod: ContactMethod
}

export async function createSupplier(
  input: CreateSupplierInput
): Promise<{ data: SupplierWithStats | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      user_id: userData.user.id,
      name: input.name,
      contact_number: input.contactNumber || null,
      contact_method: input.contactMethod,
    })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  const typedData = data as unknown as SupplierRow

  revalidatePath('/suppliers')

  return {
    data: {
      id: typedData.id,
      name: typedData.name,
      contactNumber: typedData.contact_number,
      contactMethod: typedData.contact_method as ContactMethod,
      productCount: 0,
      lastOrderDate: null,
      createdAt: typedData.created_at,
    },
    error: null,
  }
}

interface UpdateSupplierInput {
  id: string
  name?: string
  contactNumber?: string
  contactMethod?: ContactMethod
}

export async function updateSupplier(
  input: UpdateSupplierInput
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const updateData: Record<string, string | null> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.contactNumber !== undefined) updateData.contact_number = input.contactNumber
  if (input.contactMethod !== undefined) updateData.contact_method = input.contactMethod

  const { error } = await supabase
    .from('suppliers')
    .update(updateData)
    .eq('id', input.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/suppliers')
  return { success: true, error: null }
}

export async function deleteSupplier(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/suppliers')
  return { success: true, error: null }
}

export interface SupplierSimple {
  id: string
  name: string
  contactNumber: string | null
  contactMethod: ContactMethod
}

export async function getSuppliersSimple(): Promise<{ data: SupplierSimple[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) {
    return { data: null, error: 'Unauthorized' }
  }

  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('id, name, contact_number, contact_method')
    .eq('user_id', userData.user.id)
    .order('name', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  const typedSuppliers = suppliers as unknown as SupplierRow[]

  return {
    data: typedSuppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactNumber: s.contact_number,
      contactMethod: s.contact_method as ContactMethod,
    })),
    error: null,
  }
}
