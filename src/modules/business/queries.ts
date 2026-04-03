import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/db.types'

type Tables = Database['public']['Tables']
export type Business = Tables['businesses']['Row']
export type Staff = Tables['staff']['Row']
export type Service = Tables['services']['Row']
export type StaffService = Tables['staff_services']['Row']
export type BusinessHours = Tables['business_hours']['Row']
export type StaffWorkingHours = Tables['staff_working_hours']['Row']

// ─── Business ────────────────────────────────────────────────────────────────

export async function getBusiness(businessId: string): Promise<Business | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single()
  return data
}

// ─── Business hours ───────────────────────────────────────────────────────────

export async function getBusinessHours(businessId: string): Promise<BusinessHours[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', businessId)
    .order('weekday')
  return data ?? []
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export async function getStaffList(businessId: string): Promise<Staff[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', businessId)
    .order('display_name')
  return data ?? []
}

export async function getActiveStaff(businessId: string): Promise<Staff[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('display_name')
  return data ?? []
}

export async function getStaffWorkingHours(staffId: string): Promise<StaffWorkingHours[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('staff_working_hours')
    .select('*')
    .eq('staff_id', staffId)
    .order('weekday')
  return data ?? []
}

export async function getStaffServiceIds(staffId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('staff_services')
    .select('service_id')
    .eq('staff_id', staffId)
  return (data ?? []).map((r) => r.service_id)
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function getServiceList(businessId: string): Promise<Service[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .order('name')
  return data ?? []
}

export async function getActiveServices(businessId: string): Promise<Service[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name')
  return data ?? []
}
