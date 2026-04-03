import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { getActiveStaff } from '@/modules/business/queries'
import { getBookingsForWeek } from '@/modules/booking/actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CalendarClient } from './CalendarClient'
import { startOfWeek, format } from 'date-fns'

export default async function CalendarPage() {
  const tenant = await getCurrentTenant()

  const supabase = await createSupabaseServerClient()
  const { data: biz } = await supabase
    .from('businesses')
    .select('timezone')
    .eq('id', tenant.businessId)
    .single()

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  const weekStartIso = weekStart.toISOString()

  const [staff, bookings] = await Promise.all([
    getActiveStaff(tenant.businessId),
    getBookingsForWeek(weekStartIso),
  ])

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <h1 className="text-2xl font-semibold">Calendar</h1>
      </div>
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <CalendarClient
          initialBookings={bookings as Parameters<typeof CalendarClient>[0]['initialBookings']}
          staff={staff}
          businessId={tenant.businessId}
          timezone={biz?.timezone ?? 'UTC'}
          initialWeekStart={weekStartIso}
        />
      </div>
    </div>
  )
}
