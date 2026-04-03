import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// ─── Date helpers (server-side, no tz import needed for simple week range) ────

function startOfWeek(d: Date) {
  const day = new Date(d)
  day.setHours(0, 0, 0, 0)
  day.setDate(day.getDate() - day.getDay()) // Sunday
  return day
}

function endOfWeek(d: Date) {
  const start = startOfWeek(d)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return end
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const tenant = await getCurrentTenant()
  const supabase = await createSupabaseServerClient()

  const now = new Date()
  const weekStart = startOfWeek(now)
  const weekEnd   = endOfWeek(now)
  const monthStart = startOfMonth(now)

  // ── Fetch bookings for this week (excluding cancelled) ─────────────────────
  const { data: weekBookings } = await supabase
    .from('bookings')
    .select('id, status, staff_id, staff_name_snapshot, start_at, price_snapshot')
    .eq('business_id', tenant.businessId)
    .gte('start_at', weekStart.toISOString())
    .lt('start_at', weekEnd.toISOString())

  // ── Fetch bookings for this month (for revenue) ────────────────────────────
  const { data: monthBookings } = await supabase
    .from('bookings')
    .select('price_snapshot, status')
    .eq('business_id', tenant.businessId)
    .gte('start_at', monthStart.toISOString())
    .neq('status', 'cancelled')

  // ── Fetch total bookings all-time ──────────────────────────────────────────
  const { count: totalCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', tenant.businessId)
    .neq('status', 'cancelled')

  // ── Compute stats ──────────────────────────────────────────────────────────
  const allWeek = weekBookings ?? []

  // By status this week
  const byStatus = ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'].map((s) => ({
    status: s,
    count: allWeek.filter((b) => b.status === s).length,
  }))

  // By staff this week (non-cancelled)
  const staffMap = new Map<string, { name: string; count: number }>()
  for (const b of allWeek.filter((b) => b.status !== 'cancelled')) {
    const key = b.staff_id
    const name = b.staff_name_snapshot ?? 'Unknown'
    if (!staffMap.has(key)) staffMap.set(key, { name, count: 0 })
    staffMap.get(key)!.count++
  }
  const byStaff = [...staffMap.values()].sort((a, b) => b.count - a.count)

  // Revenue this month (completed bookings with price)
  const monthRevenue = (monthBookings ?? [])
    .filter((b) => b.status === 'completed' && b.price_snapshot)
    .reduce((sum, b) => sum + Number(b.price_snapshot), 0)

  // This week totals
  const weekTotal     = allWeek.filter((b) => b.status !== 'cancelled').length
  const weekCompleted = allWeek.filter((b) => b.status === 'completed').length
  const weekRevenue   = allWeek
    .filter((b) => b.status === 'completed' && b.price_snapshot)
    .reduce((sum, b) => sum + Number(b.price_snapshot), 0)

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-6">Analytics</h1>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="This week" value={weekTotal} sub="bookings" />
        <StatCard label="Completed" value={weekCompleted} sub="this week" />
        <StatCard label="Revenue (week)" value={`$${weekRevenue.toFixed(0)}`} sub="completed only" />
        <StatCard label="Revenue (month)" value={`$${monthRevenue.toFixed(0)}`} sub="completed only" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By status */}
        <section className="rounded-lg border p-5">
          <h2 className="text-sm font-medium mb-4">This week by status</h2>
          <div className="space-y-2">
            {byStatus.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="capitalize flex items-center gap-2">
                  <StatusDot status={status} />
                  {status.replace('_', ' ')}
                </span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </div>
        </section>

        {/* By staff */}
        <section className="rounded-lg border p-5">
          <h2 className="text-sm font-medium mb-4">This week by staff</h2>
          {byStaff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings this week.</p>
          ) : (
            <div className="space-y-3">
              {byStaff.map(({ name, count }) => (
                <div key={name} className="flex items-center gap-3 text-sm">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.max(8, (count / Math.max(...byStaff.map((s) => s.count))) * 100)}%` }}
                  />
                  <span className="whitespace-nowrap font-medium">{name}</span>
                  <span className="text-muted-foreground ml-auto">{count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        All-time bookings (non-cancelled): <strong>{totalCount ?? 0}</strong>
      </p>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}

const statusColors: Record<string, string> = {
  pending:   'bg-yellow-400',
  confirmed: 'bg-blue-400',
  completed: 'bg-green-400',
  cancelled: 'bg-red-400',
  no_show:   'bg-gray-400',
}

function StatusDot({ status }: { status: string }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${statusColors[status] ?? 'bg-gray-300'}`} />
  )
}
