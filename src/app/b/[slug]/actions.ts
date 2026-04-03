'use server'

import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { getPublicBusinessBySlug } from '@/modules/booking/public-queries'
import { getAvailableSlots } from '@/modules/booking/availability'
import { upsertCustomer } from '@/modules/booking/customer-upsert'
import { buildEmailData, sendBookingCreatedEmail } from '@/modules/notifications/send'
import { z } from 'zod'

const publicBookingSchema = z.object({
  slug:          z.string().min(1),
  serviceId:     z.string().uuid(),
  staffId:       z.string().uuid().optional(),
  startAt:       z.string().datetime(),
  customerName:  z.string().min(2).max(100),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().max(30).optional(),
  notes:         z.string().max(500).optional(),
})

type PublicBookingInput = z.infer<typeof publicBookingSchema>

export async function submitPublicBooking(input: PublicBookingInput): Promise<
  { error: string; bookingToken?: never } | { error?: never; bookingToken: string }
> {
  const parsed = publicBookingSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const {
    slug, serviceId, staffId, startAt,
    customerName, customerEmail, customerPhone, notes,
  } = parsed.data

  // 1. Resolve business from slug — never trust client-supplied businessId
  const business = await getPublicBusinessBySlug(slug)
  if (!business) return { error: 'Business not found.' }

  const supabase = createSupabaseServiceClient()

  // 3. Re-validate availability (race condition guard before calling RPC)
  const date = new Date(startAt).toISOString().slice(0, 10)
  const slots = await getAvailableSlots({
    businessId: business.id,
    serviceId,
    staffId,
    date,
    timezone: business.timezone,
    client: supabase,
  })

  const matchingSlot = slots.find(
    (s) => s.startAt.toISOString() === new Date(startAt).toISOString()
  )
  if (!matchingSlot || matchingSlot.availableStaffIds.length === 0) {
    return { error: 'This slot is no longer available. Please choose another time.' }
  }

  // 4. Resolve staff — pick first available if "any"
  const resolvedStaffId = staffId ?? matchingSlot.availableStaffIds[0]

  // 5. Upsert customer
  let customerId: string
  try {
    customerId = await upsertCustomer({
      businessId: business.id,
      fullName: customerName,
      email: customerEmail ?? null,
      phone: customerPhone ?? null,
    })
  } catch {
    return { error: 'Failed to save customer information.' }
  }

  // 6. Call create_booking RPC (atomic — advisory lock + overlap check inside SQL)
  const { data, error } = await supabase.rpc('create_booking', {
    p_business_id: business.id,
    p_service_id:  serviceId,
    p_staff_id:    resolvedStaffId,
    p_customer_id: customerId,
    p_start_at:    startAt,
    p_timezone:    business.timezone,
    p_source:      'public',
    p_notes:       notes ?? undefined,
  })

  if (error) {
    const msg = error.message
    if (msg.includes('slot_not_available'))     return { error: 'This slot was just taken. Please pick another time.' }
    if (msg.includes('outside_business_hours')) return { error: 'Outside business hours.' }
    if (msg.includes('outside_staff_hours'))    return { error: 'Staff not available at that time.' }
    if (msg.includes('staff_on_time_off'))      return { error: 'Staff is on time off.' }
    if (msg.includes('business_not_active'))    return { error: 'This business is not accepting bookings.' }
    return { error: 'Failed to create booking. Please try again.' }
  }

  const booking = data as { id: string; booking_access_token: string | null }

  // 7. Send booking_created email (fire-and-forget — don't block the response)
  buildEmailData(booking.id).then((emailData) => {
    if (emailData) sendBookingCreatedEmail(emailData).catch(console.error)
  }).catch(console.error)

  return { bookingToken: booking.booking_access_token ?? '' }
}
