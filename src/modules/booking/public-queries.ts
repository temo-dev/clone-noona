/**
 * Public-facing queries — no auth required.
 * All use the service client so they bypass RLS safely from server-side code only.
 * Never call these from client-side code or expose raw results without sanitizing.
 */
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/db.types'

type Tables = Database['public']['Tables']
type Business = Tables['businesses']['Row']
type Service  = Tables['services']['Row']
type Staff    = Tables['staff']['Row']

export type PublicBusiness = Pick<
  Business,
  'id' | 'name' | 'slug' | 'timezone' | 'description' | 'phone' | 'address' | 'logo_url'
>

export type PublicService = Pick<
  Service,
  'id' | 'name' | 'description' | 'duration_minutes' | 'buffer_before_minutes' | 'buffer_after_minutes' | 'price'
>

export type PublicStaff = Pick<Staff, 'id' | 'display_name' | 'color_code' | 'bio' | 'avatar_url'>

export async function getPublicBusinessBySlug(slug: string): Promise<PublicBusiness | null> {
  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('businesses')
    .select('id, name, slug, timezone, description, phone, address, logo_url')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  return data
}

export async function getPublicServices(businessId: string): Promise<PublicService[]> {
  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('services')
    .select('id, name, description, duration_minutes, buffer_before_minutes, buffer_after_minutes, price')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('name')
  return data ?? []
}

/** Returns active staff who can perform the given service, or all active staff if no serviceId. */
export async function getPublicStaffForService(
  businessId: string,
  serviceId?: string
): Promise<PublicStaff[]> {
  const supabase = createSupabaseServiceClient()

  if (serviceId) {
    const { data: assignments } = await supabase
      .from('staff_services')
      .select('staff_id')
      .eq('service_id', serviceId)
    const staffIds = (assignments ?? []).map((a) => a.staff_id)
    if (staffIds.length === 0) return []

    const { data } = await supabase
      .from('staff')
      .select('id, display_name, color_code, bio, avatar_url')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .in('id', staffIds)
      .order('display_name')
    return data ?? []
  }

  const { data } = await supabase
    .from('staff')
    .select('id, display_name, color_code, bio, avatar_url')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('display_name')
  return data ?? []
}

export async function getPublicBookingByToken(token: string) {
  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('bookings')
    .select(`
      id, status, start_at, end_at, timezone, notes, cancel_reason,
      service_name_snapshot, service_duration_minutes_snapshot,
      price_snapshot, staff_name_snapshot, booking_access_token,
      businesses!inner(name, slug, phone, address),
      customers!inner(full_name, email, phone)
    `)
    .eq('booking_access_token', token)
    .single()
  return data
}
