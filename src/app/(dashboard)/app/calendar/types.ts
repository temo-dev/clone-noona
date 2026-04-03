export type BookingRow = {
  id: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  start_at: string
  end_at: string
  timezone: string
  notes: string | null
  cancel_reason: string | null
  service_name_snapshot: string
  service_duration_minutes_snapshot: number
  price_snapshot: number | null
  staff_name_snapshot: string | null
  staff_id: string
  customer_id: string
  customers: { full_name: string; email: string | null; phone: string | null } | null
}
