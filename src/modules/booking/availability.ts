import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { addMinutes, parseISO, format } from 'date-fns'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/db.types'

export type SlotResult = {
  startAt: Date   // UTC
  endAt: Date     // UTC (startAt + duration_minutes, no buffers)
  availableStaffIds: string[]
}

type StaffCandidate = {
  id: string
  workingStart: string   // "HH:mm"
  workingEnd: string
  // Existing bookings' effective ranges for that day
  blockedRanges: Array<{ start: Date; end: Date }>
}

/**
 * Generate 15-minute-interval slots for a given service + date.
 * Slot interval = 15 min (start times). Duration comes from the service.
 *
 * Returns only slots where at least one staff member is free.
 * Each slot carries the list of free staff IDs so the caller can assign one at submit time.
 *
 * All internal time math uses UTC. Business hours / staff hours are interpreted
 * in the business timezone.
 */
export async function getAvailableSlots(input: {
  businessId: string
  serviceId: string
  staffId?: string        // undefined = any available
  date: string            // YYYY-MM-DD in business timezone
  timezone: string
  /** Pass a pre-created client (e.g. service client for public routes). Defaults to session client. */
  client?: SupabaseClient<Database>
}): Promise<SlotResult[]> {
  const { businessId, serviceId, staffId, date, timezone } = input
  const supabase = input.client ?? (await createSupabaseServerClient())

  // 1. Load service
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes, buffer_before_minutes, buffer_after_minutes')
    .eq('id', serviceId)
    .eq('business_id', businessId)
    .eq('is_active', true)
    .single()
  if (!service) return []

  const { duration_minutes, buffer_before_minutes, buffer_after_minutes } = service

  // 2. Weekday in business timezone
  const dayStart = fromZonedTime(`${date}T00:00:00`, timezone)
  const weekday = toZonedTime(dayStart, timezone).getDay()   // 0=Sun

  // 3. Business hours for this weekday
  const { data: bizHours } = await supabase
    .from('business_hours')
    .select('start_time, end_time, is_closed')
    .eq('business_id', businessId)
    .eq('weekday', weekday)
    .single()
  if (!bizHours || bizHours.is_closed) return []

  const bizOpenUtc  = fromZonedTime(`${date}T${bizHours.start_time}`, timezone)
  const bizCloseUtc = fromZonedTime(`${date}T${bizHours.end_time}`, timezone)

  // 4. Candidate staff
  let staffQuery = supabase
    .from('staff')
    .select('id')
    .eq('business_id', businessId)
    .eq('is_active', true)

  if (staffId) {
    staffQuery = staffQuery.eq('id', staffId)
  } else {
    // Only staff who can perform this service
    const { data: assignments } = await supabase
      .from('staff_services')
      .select('staff_id')
      .eq('service_id', serviceId)
    if (!assignments || assignments.length === 0) return []
    staffQuery = staffQuery.in('id', assignments.map((a) => a.staff_id))
  }

  const { data: staffRows } = await staffQuery
  if (!staffRows || staffRows.length === 0) return []

  // 5. Build per-staff blocked ranges (time-off + existing bookings)
  const candidates: StaffCandidate[] = []

  for (const s of staffRows) {
    // Staff working hours for this weekday
    const { data: wh } = await supabase
      .from('staff_working_hours')
      .select('start_time, end_time, is_off')
      .eq('staff_id', s.id)
      .eq('weekday', weekday)
      .single()

    if (!wh || wh.is_off) continue

    // Staff working window clipped to business hours
    const staffStartUtc = fromZonedTime(`${date}T${wh.start_time}`, timezone)
    const staffEndUtc   = fromZonedTime(`${date}T${wh.end_time}`, timezone)
    const windowStart   = staffStartUtc > bizOpenUtc ? staffStartUtc : bizOpenUtc
    const windowEnd     = staffEndUtc < bizCloseUtc ? staffEndUtc : bizCloseUtc

    if (windowStart >= windowEnd) continue

    // Time-off overlapping this date
    const dayStartUtc = fromZonedTime(`${date}T00:00:00`, timezone)
    const dayEndUtc   = fromZonedTime(`${date}T23:59:59`, timezone)

    const { data: timeOff } = await supabase
      .from('staff_time_off')
      .select('start_at, end_at')
      .eq('staff_id', s.id)
      .lt('start_at', dayEndUtc.toISOString())
      .gt('end_at', dayStartUtc.toISOString())

    // Existing confirmed/pending bookings (effective ranges)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('effective_start_at, effective_end_at')
      .eq('staff_id', s.id)
      .neq('status', 'cancelled')
      .lt('effective_start_at', dayEndUtc.toISOString())
      .gt('effective_end_at', dayStartUtc.toISOString())

    const blockedRanges = [
      ...(timeOff ?? []).map((t) => ({ start: parseISO(t.start_at), end: parseISO(t.end_at) })),
      ...(bookings ?? []).map((b) => ({
        start: parseISO(b.effective_start_at),
        end: parseISO(b.effective_end_at),
      })),
    ]

    candidates.push({
      id: s.id,
      workingStart: format(toZonedTime(windowStart, timezone), 'HH:mm'),
      workingEnd:   format(toZonedTime(windowEnd, timezone), 'HH:mm'),
      blockedRanges,
    })

    // Store actual UTC window on candidate for slot filtering below
    ;(candidates[candidates.length - 1] as StaffCandidate & { _windowStart: Date; _windowEnd: Date })._windowStart = windowStart
    ;(candidates[candidates.length - 1] as StaffCandidate & { _windowStart: Date; _windowEnd: Date })._windowEnd = windowEnd
  }

  if (candidates.length === 0) return []

  // 6. Generate slot start times at 15-min intervals over business open hours
  const SLOT_INTERVAL = 15
  const slots: SlotResult[] = []
  let cursor = bizOpenUtc

  while (cursor < bizCloseUtc) {
    const slotStart  = cursor
    const slotEnd    = addMinutes(slotStart, duration_minutes)   // pure service time
    const effStart   = addMinutes(slotStart, -buffer_before_minutes)
    const effEnd     = addMinutes(slotEnd, buffer_after_minutes)

    // Slot must finish within business hours (effective end)
    if (effEnd > bizCloseUtc) break

    // Collect free staff for this slot
    const freeStaffIds: string[] = []

    for (const candidate of candidates) {
      const c = candidate as StaffCandidate & { _windowStart: Date; _windowEnd: Date }

      // Slot must be within staff working window
      if (effStart < c._windowStart || effEnd > c._windowEnd) continue

      // Check no blocked range overlaps effective slot (strict inequality)
      const blocked = candidate.blockedRanges.some(
        (r) => r.start < effEnd && r.end > effStart
      )
      if (!blocked) freeStaffIds.push(candidate.id)
    }

    if (freeStaffIds.length > 0) {
      slots.push({ startAt: slotStart, endAt: slotEnd, availableStaffIds: freeStaffIds })
    }

    cursor = addMinutes(cursor, SLOT_INTERVAL)
  }

  return slots
}
