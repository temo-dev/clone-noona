import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BookingsClient } from './BookingsClient'
import { format, startOfDay } from 'date-fns'

export default async function BookingsPage() {
  const tenant = await getCurrentTenant()
  const supabase = await createSupabaseServerClient()

  // Default: upcoming bookings (today onwards)
  const today = startOfDay(new Date()).toISOString()

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, status, start_at, end_at, timezone, notes, cancel_reason,
      service_name_snapshot, service_duration_minutes_snapshot,
      price_snapshot, staff_name_snapshot, staff_id, customer_id,
      customers(full_name, email, phone)
    `)
    .eq('business_id', tenant.businessId)
    .gte('start_at', today)
    .order('start_at')
    .limit(100)

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-6">Bookings</h1>
      <BookingsClient initialBookings={(bookings ?? []) as Parameters<typeof BookingsClient>[0]['initialBookings']} />
    </div>
  )
}
