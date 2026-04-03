'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { requireRole } from '@/modules/auth/role-guard'
import { createBusinessSchema, createServiceSchema, createStaffSchema } from '@/lib/types/schemas'
import { z } from 'zod'

// ─── Business settings ────────────────────────────────────────────────────────

export async function updateBusinessAction(formData: FormData) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const parsed = createBusinessSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    timezone: formData.get('timezone'),
    phone: formData.get('phone') || undefined,
    address: formData.get('address') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()

  // Check slug uniqueness using service client (bypasses RLS to see ALL slugs)
  const service = createSupabaseServiceClient()
  const { data: slugConflict } = await service
    .from('businesses')
    .select('id')
    .eq('slug', parsed.data.slug)
    .neq('id', tenant.businessId)
    .single()
  if (slugConflict) return { error: 'This URL is already taken.' }

  const { error } = await supabase
    .from('businesses')
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      timezone: parsed.data.timezone,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
    })
    .eq('id', tenant.businessId)

  if (error) return { error: 'Failed to update business.' }

  revalidatePath('/app/settings/business')
  return { success: true }
}

// ─── Business hours ───────────────────────────────────────────────────────────

const businessHoursRowSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  is_closed: z.boolean(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
})

export async function upsertBusinessHoursAction(
  rows: Array<{
    weekday: number
    is_closed: boolean
    start_time: string
    end_time: string
  }>
) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const parsed = z.array(businessHoursRowSchema).safeParse(rows)
  if (!parsed.success) return { error: 'Invalid hours data.' }

  const supabase = await createSupabaseServerClient()

  const upsertRows = parsed.data.map((row) => ({
    business_id: tenant.businessId,
    weekday: row.weekday,
    is_closed: row.is_closed,
    start_time: row.start_time,
    end_time: row.end_time,
  }))

  const { error } = await supabase
    .from('business_hours')
    .upsert(upsertRows, { onConflict: 'business_id,weekday' })

  if (error) return { error: 'Failed to save hours.' }

  revalidatePath('/app/settings/availability')
  return { success: true }
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export async function createStaffAction(formData: FormData) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const parsed = createStaffSchema.safeParse({
    displayName: formData.get('displayName'),
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    colorCode: formData.get('colorCode') || '#6366f1',
    bio: formData.get('bio') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('staff')
    .insert({
      business_id: tenant.businessId,
      display_name: parsed.data.displayName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      color_code: parsed.data.colorCode,
      bio: parsed.data.bio || null,
    })
    .select('id')
    .single()

  if (error || !data) return { error: 'Failed to create staff member.' }

  revalidatePath('/app/settings/staff')
  return { success: true, staffId: data.id }
}

export async function updateStaffAction(staffId: string, formData: FormData) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const parsed = createStaffSchema.safeParse({
    displayName: formData.get('displayName'),
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    colorCode: formData.get('colorCode') || '#6366f1',
    bio: formData.get('bio') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('staff')
    .update({
      display_name: parsed.data.displayName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      color_code: parsed.data.colorCode,
      bio: parsed.data.bio || null,
    })
    .eq('id', staffId)
    .eq('business_id', tenant.businessId)

  if (error) return { error: 'Failed to update staff member.' }

  revalidatePath('/app/settings/staff')
  return { success: true }
}

export async function archiveStaffAction(staffId: string) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('staff')
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq('id', staffId)
    .eq('business_id', tenant.businessId)

  if (error) return { error: 'Failed to archive staff member.' }

  revalidatePath('/app/settings/staff')
  return { success: true }
}

export async function restoreStaffAction(staffId: string) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('staff')
    .update({ is_active: true, archived_at: null })
    .eq('id', staffId)
    .eq('business_id', tenant.businessId)

  if (error) return { error: 'Failed to restore staff member.' }

  revalidatePath('/app/settings/staff')
  return { success: true }
}

const workingHoursRowSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  is_off: z.boolean(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
})

export async function upsertStaffWorkingHoursAction(
  staffId: string,
  rows: Array<{
    weekday: number
    is_off: boolean
    start_time: string
    end_time: string
  }>
) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const parsed = z.array(workingHoursRowSchema).safeParse(rows)
  if (!parsed.success) return { error: 'Invalid working hours data.' }

  const supabase = await createSupabaseServerClient()

  // Verify staff belongs to this business
  const { data: staffRow } = await supabase
    .from('staff')
    .select('id')
    .eq('id', staffId)
    .eq('business_id', tenant.businessId)
    .single()
  if (!staffRow) return { error: 'Staff not found.' }

  const upsertRows = parsed.data.map((row) => ({
    business_id: tenant.businessId,
    staff_id: staffId,
    weekday: row.weekday,
    is_off: row.is_off,
    start_time: row.start_time,
    end_time: row.end_time,
  }))

  const { error } = await supabase
    .from('staff_working_hours')
    .upsert(upsertRows, { onConflict: 'staff_id,weekday' })

  if (error) return { error: 'Failed to save working hours.' }

  revalidatePath('/app/settings/staff')
  return { success: true }
}

export async function updateStaffServicesAction(staffId: string, serviceIds: string[]) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const supabase = await createSupabaseServerClient()

  // Verify staff belongs to this business
  const { data: staffRow } = await supabase
    .from('staff')
    .select('id')
    .eq('id', staffId)
    .eq('business_id', tenant.businessId)
    .single()
  if (!staffRow) return { error: 'Staff not found.' }

  // Atomic replace via RPC (DELETE not-in-list + INSERT new — single transaction)
  const { error } = await supabase.rpc('update_staff_services', {
    p_business_id: tenant.businessId,
    p_staff_id:    staffId,
    p_service_ids: serviceIds,
  })
  if (error) {
    if (error.message.includes('staff_not_found')) return { error: 'Staff not found.' }
    return { error: 'Failed to update service assignments.' }
  }

  revalidatePath('/app/settings/staff')
  return { success: true }
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function createServiceAction(formData: FormData) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const parsed = createServiceSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    durationMinutes: Number(formData.get('durationMinutes')),
    bufferBeforeMinutes: Number(formData.get('bufferBeforeMinutes') || 0),
    bufferAfterMinutes: Number(formData.get('bufferAfterMinutes') || 0),
    price: formData.get('price') ? Number(formData.get('price')) : undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('services').insert({
    business_id: tenant.businessId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    duration_minutes: parsed.data.durationMinutes,
    buffer_before_minutes: parsed.data.bufferBeforeMinutes,
    buffer_after_minutes: parsed.data.bufferAfterMinutes,
    price: parsed.data.price ?? null,
  })

  if (error) return { error: 'Failed to create service.' }

  revalidatePath('/app/settings/services')
  return { success: true }
}

export async function updateServiceAction(serviceId: string, formData: FormData) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const parsed = createServiceSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') || undefined,
    durationMinutes: Number(formData.get('durationMinutes')),
    bufferBeforeMinutes: Number(formData.get('bufferBeforeMinutes') || 0),
    bufferAfterMinutes: Number(formData.get('bufferAfterMinutes') || 0),
    price: formData.get('price') ? Number(formData.get('price')) : undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('services')
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      duration_minutes: parsed.data.durationMinutes,
      buffer_before_minutes: parsed.data.bufferBeforeMinutes,
      buffer_after_minutes: parsed.data.bufferAfterMinutes,
      price: parsed.data.price ?? null,
    })
    .eq('id', serviceId)
    .eq('business_id', tenant.businessId)

  if (error) return { error: 'Failed to update service.' }

  revalidatePath('/app/settings/services')
  return { success: true }
}

export async function archiveServiceAction(serviceId: string) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('services')
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq('id', serviceId)
    .eq('business_id', tenant.businessId)

  if (error) return { error: 'Failed to archive service.' }

  revalidatePath('/app/settings/services')
  return { success: true }
}

export async function restoreServiceAction(serviceId: string) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner', 'manager'])

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('services')
    .update({ is_active: true, archived_at: null })
    .eq('id', serviceId)
    .eq('business_id', tenant.businessId)

  if (error) return { error: 'Failed to restore service.' }

  revalidatePath('/app/settings/services')
  return { success: true }
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function inviteMemberAction(email: string, role: string) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner'])

  if (!email || !email.includes('@')) return { error: 'Invalid email address.' }
  if (!['manager', 'staff'].includes(role)) return { error: 'Invalid role.' }

  // Look up user by email in profiles (service client to read auth data)
  const service = createSupabaseServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (!profile) {
    return { error: 'No account found with that email. They must register first.' }
  }

  // Prevent inviting yourself
  if (profile.id === tenant.userId) return { error: 'You cannot invite yourself.' }

  const supabase = await createSupabaseServerClient()

  // Check if already a member
  const { data: existing } = await supabase
    .from('business_members')
    .select('id, status')
    .eq('business_id', tenant.businessId)
    .eq('user_id', profile.id)
    .single()

  if (existing) {
    if (existing.status === 'active') return { error: 'This person is already a member.' }
    // Re-activate if previously removed
    const { error } = await supabase
      .from('business_members')
      .update({ role, status: 'active', joined_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return { error: 'Failed to re-add member.' }
    revalidatePath('/app/settings/members')
    return { success: true }
  }

  const { error } = await supabase
    .from('business_members')
    .insert({
      business_id: tenant.businessId,
      user_id:     profile.id,
      role,
      status:      'active',
      joined_at:   new Date().toISOString(),
    })

  if (error) return { error: 'Failed to add member.' }

  revalidatePath('/app/settings/members')
  return { success: true }
}

export async function removeMemberAction(memberId: string) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner'])

  const supabase = await createSupabaseServerClient()

  // Prevent removing the owner themselves
  const { data: member } = await supabase
    .from('business_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('business_id', tenant.businessId)
    .single()

  if (!member) return { error: 'Member not found.' }
  if (member.role === 'owner') return { error: 'Cannot remove the owner.' }
  if (member.user_id === tenant.userId) return { error: 'You cannot remove yourself.' }

  const { error } = await supabase
    .from('business_members')
    .update({ status: 'removed' })
    .eq('id', memberId)
    .eq('business_id', tenant.businessId)

  if (error) return { error: 'Failed to remove member.' }

  revalidatePath('/app/settings/members')
  return { success: true }
}

export async function updateMemberRoleAction(memberId: string, role: string) {
  const tenant = await getCurrentTenant()
  requireRole(tenant, ['owner'])

  if (!['manager', 'staff'].includes(role)) return { error: 'Invalid role.' }

  const supabase = await createSupabaseServerClient()

  const { data: member } = await supabase
    .from('business_members')
    .select('role, user_id')
    .eq('id', memberId)
    .eq('business_id', tenant.businessId)
    .single()

  if (!member) return { error: 'Member not found.' }
  if (member.role === 'owner') return { error: 'Cannot change the owner role.' }
  if (member.user_id === tenant.userId) return { error: 'You cannot change your own role.' }

  const { error } = await supabase
    .from('business_members')
    .update({ role })
    .eq('id', memberId)
    .eq('business_id', tenant.businessId)

  if (error) return { error: 'Failed to update role.' }

  revalidatePath('/app/settings/members')
  return { success: true }
}
