'use server'

import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { buildEmailData, sendBookingCancelledEmail } from '@/modules/notifications/send'

export async function cancelByTokenAction(
  token: string,
  reason?: string
): Promise<{ error?: string; success?: true }> {
  if (!token) return { error: 'Invalid token.' }

  const supabase = createSupabaseServiceClient()

  // Get booking id before cancelling so we can send email
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('booking_access_token', token)
    .single()

  const { error } = await supabase.rpc('cancel_booking_by_token', {
    p_token:  token,
    p_reason: reason ?? undefined,
  })

  if (error) {
    if (error.message.includes('booking_not_found'))           return { error: 'Booking not found.' }
    if (error.message.includes('booking_cannot_be_cancelled')) return { error: 'This booking can no longer be cancelled.' }
    return { error: 'Failed to cancel booking.' }
  }

  if (existing?.id) {
    buildEmailData(existing.id).then((d) => {
      if (d) sendBookingCancelledEmail({ ...d, cancelReason: reason }).catch(console.error)
    }).catch(console.error)
  }

  return { success: true }
}
