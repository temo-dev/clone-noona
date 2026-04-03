'use server'

import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { buildEmailData, sendBookingCancelledEmail, sendBookingCreatedEmail } from '@/modules/notifications/send'

export async function rescheduleByTokenAction(
  token: string,
  newStartAt: string
): Promise<{ error?: string; newToken?: string }> {
  if (!token || !newStartAt) return { error: 'Invalid input.' }

  const supabase = createSupabaseServiceClient()

  // Get old booking id before reschedule
  const { data: old } = await supabase
    .from('bookings')
    .select('id')
    .eq('booking_access_token', token)
    .single()

  const { data, error } = await supabase.rpc('reschedule_booking_by_token', {
    p_token:        token,
    p_new_start_at: newStartAt,
  })

  if (error) {
    if (error.message.includes('booking_not_found'))             return { error: 'Booking not found.' }
    if (error.message.includes('booking_cannot_be_rescheduled')) return { error: 'This booking cannot be rescheduled.' }
    if (error.message.includes('slot_not_available'))            return { error: 'That slot is no longer available.' }
    return { error: 'Failed to reschedule. Please try again.' }
  }

  const newBooking = data as { id: string; booking_access_token: string }

  // Send cancelled email for old booking, created email for new booking (fire-and-forget)
  if (old?.id) {
    buildEmailData(old.id).then((d) => {
      if (d) sendBookingCancelledEmail({ ...d, cancelReason: 'rescheduled' }).catch(console.error)
    }).catch(console.error)
  }
  buildEmailData(newBooking.id).then((d) => {
    if (d) sendBookingCreatedEmail(d).catch(console.error)
  }).catch(console.error)

  return { newToken: newBooking.booking_access_token }
}
