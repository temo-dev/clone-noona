'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { requireRole } from '@/modules/auth/role-guard'
import { upsertCustomer } from './customer-upsert'
import { getAvailableSlots } from './availability'
import {
  buildEmailData,
  sendBookingConfirmedEmail,
  sendBookingCancelledEmail,
} from '@/modules/notifications/send'
import { z } from 'zod'

// ─── Status transitions ───────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no_show'],
  completed: [],
  cancelled: [],
  no_show:   [],
}

function assertAllowedTransition(currentStatus: string, newStatus: string) {
  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`)
  }
}

// ─── Create booking (dashboard / admin) ──────────────────────────────────────

const createBookingSchema = z.object({
  serviceId:    z.string().uuid(),
  staffId:      z.string().uuid().optional(),
  startAt:      z.string().datetime(),
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().max(30).optional(),
  notes:        z.string().max(500).optional(),
})

export async function createBookingAction(raw: unknown) {
  const tenant = await getCurrentTenant()

  const parsed = createBookingSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { serviceId, staffId, startAt, customerName, customerEmail, customerPhone, notes } = parsed.data

  const supabase = await createSupabaseServerClient()

  // Resolve business timezone
  const { data: biz } = await supabase
    .from('businesses')
    .select('timezone')
    .eq('id', tenant.businessId)
    .single()
  if (!biz) return { error: 'Business not found.' }

  // Resolve staff: use provided or pick first available
  let resolvedStaffId = staffId
  if (!resolvedStaffId) {
    const date = startAt.slice(0, 10)
    const slots = await getAvailableSlots({
      businessId: tenant.businessId,
      serviceId,
      date,
      timezone: biz.timezone,
    })
    const matchingSlot = slots.find((s) => s.startAt.toISOString() === new Date(startAt).toISOString())
    if (!matchingSlot || matchingSlot.availableStaffIds.length === 0) {
      return { error: 'This slot is no longer available.' }
    }
    resolvedStaffId = matchingSlot.availableStaffIds[0]
  }

  // Upsert customer
  let customerId: string
  try {
    customerId = await upsertCustomer({
      businessId: tenant.businessId,
      fullName: customerName,
      email: customerEmail || null,
      phone: customerPhone || null,
    })
  } catch {
    return { error: 'Failed to create customer record.' }
  }

  // Call RPC — atomic booking with overlap check
  const { data, error } = await supabase.rpc('create_booking', {
    p_business_id: tenant.businessId,
    p_service_id:  serviceId,
    p_staff_id:    resolvedStaffId,
    p_customer_id: customerId,
    p_start_at:    startAt,
    p_timezone:    biz.timezone,
    p_source:      'admin',
    p_notes:       notes || null,
  })

  if (error) {
    const msg = error.message
    if (msg.includes('slot_not_available'))       return { error: 'Slot just filled. Please choose another time.' }
    if (msg.includes('outside_business_hours'))   return { error: 'Outside business hours.' }
    if (msg.includes('outside_staff_hours'))      return { error: 'Staff not available at that time.' }
    if (msg.includes('staff_on_time_off'))        return { error: 'Staff is on time off.' }
    if (msg.includes('staff_cannot_perform'))     return { error: 'Staff cannot perform this service.' }
    return { error: 'Failed to create booking.' }
  }

  revalidatePath('/app/calendar')
  revalidatePath('/app/bookings')
  return { success: true, booking: data }
}

// ─── Update booking status (confirm / complete / no_show) ────────────────────

export async function updateBookingStatusAction(
  bookingId: string,
  newStatus: 'confirmed' | 'completed' | 'no_show'
) {
  const tenant = await getCurrentTenant()
  const supabase = await createSupabaseServerClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .eq('business_id', tenant.businessId)
    .single()

  if (!booking) return { error: 'Booking not found.' }

  try {
    assertAllowedTransition(booking.status, newStatus)
  } catch (e) {
    return { error: (e as Error).message }
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', bookingId)
    .eq('business_id', tenant.businessId)

  if (error) return { error: 'Failed to update status.' }

  // Send confirmed email
  if (newStatus === 'confirmed') {
    buildEmailData(bookingId).then((d) => {
      if (d) sendBookingConfirmedEmail(d).catch(console.error)
    }).catch(console.error)
  }

  revalidatePath('/app/calendar')
  revalidatePath('/app/bookings')
  return { success: true }
}

// ─── Cancel booking (dashboard — calls RPC for proper audit log) ──────────────

export async function cancelBookingAction(bookingId: string, reason?: string) {
  const tenant = await getCurrentTenant()
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('cancel_booking_by_member', {
    p_booking_id: bookingId,
    p_reason:     reason ?? null,
  })

  if (error) {
    if (error.message.includes('unauthorized'))              return { error: 'Not authorized to cancel this booking.' }
    if (error.message.includes('booking_cannot_be_cancelled')) return { error: 'Booking cannot be cancelled.' }
    return { error: 'Failed to cancel booking.' }
  }

  // Send cancelled email
  buildEmailData(bookingId).then((d) => {
    if (d) sendBookingCancelledEmail({ ...d, cancelReason: reason }).catch(console.error)
  }).catch(console.error)

  revalidatePath('/app/calendar')
  revalidatePath('/app/bookings')
  return { success: true }
}

// ─── Reschedule booking (dashboard) ──────────────────────────────────────────

const rescheduleSchema = z.object({
  bookingId:   z.string().uuid(),
  newStartAt:  z.string().datetime(),
})

export async function rescheduleBookingAction(bookingId: string, newStartAt: string) {
  const tenant = await getCurrentTenant()

  const parsed = rescheduleSchema.safeParse({ bookingId, newStartAt })
  if (!parsed.success) return { error: 'Invalid input.' }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('reschedule_booking_by_member', {
    p_booking_id:    bookingId,
    p_new_start_at:  newStartAt,
  })

  if (error) {
    if (error.message.includes('slot_not_available'))           return { error: 'Slot not available.' }
    if (error.message.includes('booking_cannot_be_rescheduled')) return { error: 'Booking cannot be rescheduled.' }
    if (error.message.includes('unauthorized'))                 return { error: 'Not authorized.' }
    return { error: 'Failed to reschedule booking.' }
  }

  revalidatePath('/app/calendar')
  revalidatePath('/app/bookings')
  return { success: true, booking: data }
}

// ─── Fetch bookings for a week (used by API route) ───────────────────────────

export async function getBookingsForWeek(businessId: string, weekStart: string) {
  const supabase = await createSupabaseServerClient()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const { data } = await supabase
    .from('bookings')
    .select(`
      id, status, start_at, end_at, effective_start_at, effective_end_at,
      timezone, notes, cancel_reason,
      service_name_snapshot, service_duration_minutes_snapshot,
      price_snapshot, staff_name_snapshot,
      staff_id, customer_id,
      customers(full_name, email, phone)
    `)
    .eq('business_id', businessId)
    .gte('start_at', weekStart)
    .lt('start_at', weekEnd.toISOString())
    .neq('status', 'cancelled')
    .order('start_at')

  return data ?? []
}
