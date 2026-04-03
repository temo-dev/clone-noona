import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const tenant = await getCurrentTenant()
  const supabase = await createSupabaseServerClient()

  // Quick stats: bookings today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { count: todayCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', tenant.businessId)
    .gte('start_at', today.toISOString())
    .lt('start_at', tomorrow.toISOString())
    .neq('status', 'cancelled')

  const { count: pendingCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', tenant.businessId)
    .eq('status', 'pending')

  const { count: confirmedCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', tenant.businessId)
    .eq('status', 'confirmed')
    .gte('start_at', today.toISOString())

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Bookings today" value={todayCount ?? 0} />
        <StatCard label="Pending confirmation" value={pendingCount ?? 0} />
        <StatCard label="Upcoming confirmed" value={confirmedCount ?? 0} />
      </div>

      <div className="text-sm text-muted-foreground">
        <p>Use the sidebar to manage your bookings, staff, and services.</p>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}
