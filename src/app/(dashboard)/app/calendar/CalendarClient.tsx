'use client'

import { useState, useCallback, Fragment } from 'react'
import { addWeeks, subWeeks, startOfWeek, addDays, format, parseISO, isSameDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { Button } from '@/components/ui/button'
import { BookingCreateModal } from './BookingCreateModal'
import { BookingDrawer } from './BookingDrawer'
import type { Staff } from '@/modules/business/queries'
import type { BookingRow } from './types'

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 border-yellow-400 text-yellow-900',
  confirmed: 'bg-blue-100 border-blue-400 text-blue-900',
  completed: 'bg-green-100 border-green-400 text-green-900',
  no_show:   'bg-gray-100 border-gray-400 text-gray-600',
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 07:00 – 20:00

export function CalendarClient({
  initialBookings,
  staff,
  businessId,
  timezone,
  initialWeekStart,
}: {
  initialBookings: BookingRow[]
  staff: Staff[]
  businessId: string
  timezone: string
  initialWeekStart: string
}) {
  const [weekStart, setWeekStart] = useState(() => new Date(initialWeekStart))
  const [bookings, setBookings] = useState<BookingRow[]>(initialBookings)
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const navigate = useCallback(async (newWeekStart: Date) => {
    setLoading(true)
    setWeekStart(newWeekStart)
    try {
      const res = await fetch(`/api/bookings/week?weekStart=${newWeekStart.toISOString()}`)
      const data = await res.json()
      setBookings(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  function openBooking(b: BookingRow) {
    setSelectedBooking(b)
    setDrawerOpen(true)
  }

  function onBookingCreated(newBooking: BookingRow) {
    setBookings((prev) => [...prev, newBooking])
    setCreateOpen(false)
  }

  function onBookingUpdated(updated: BookingRow) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }

  function onBookingCancelled(id: string) {
    setBookings((prev) => prev.filter((b) => b.id !== id))
    setDrawerOpen(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(subWeeks(weekStart, 1))}>
            ←
          </Button>
          <span className="text-sm font-medium text-center min-w-0">
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigate(addWeeks(weekStart, 1))}>
            →
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Booking</Button>
      </div>

      {/* Calendar grid — horizontal scroll on mobile */}
      <div className="flex-1 overflow-auto border rounded-lg">
        <div
          className="grid"
          style={{ gridTemplateColumns: `50px repeat(${days.length}, minmax(90px, 1fr))`, minWidth: `${50 + days.length * 90}px` }}
        >
          {/* Header row */}
          <div className="sticky top-0 z-10 bg-background border-b" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="sticky top-0 z-10 bg-background border-b border-l px-2 py-2 text-center"
            >
              <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
              <p className={`text-sm font-medium ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </p>
            </div>
          ))}

          {/* Time rows */}
          {HOURS.map((hour) => (
            <Fragment key={hour}>
              {/* Time label */}
              <div
                className="border-b px-2 py-0 text-right text-xs text-muted-foreground leading-none"
                style={{ height: 60 }}
              >
                <span className="relative -top-2">{format(new Date(2000, 0, 1, hour), 'h a')}</span>
              </div>

              {/* Day cells */}
              {days.map((day) => {
                const cellBookings = bookings.filter((b) => {
                  const bStart = toZonedTime(parseISO(b.start_at), timezone)
                  return isSameDay(bStart, day) && bStart.getHours() === hour
                })

                return (
                  <div
                    key={`cell-${day.toISOString()}-${hour}`}
                    className={`border-b border-l relative ${loading ? 'opacity-50' : ''}`}
                    style={{ height: 60 }}
                  >
                    {cellBookings.map((b) => {
                      const bStart  = toZonedTime(parseISO(b.start_at), timezone)
                      const bEnd    = toZonedTime(parseISO(b.end_at), timezone)
                      const topPct  = (bStart.getMinutes() / 60) * 100
                      const durMins = b.service_duration_minutes_snapshot
                      const heightPct = Math.min((durMins / 60) * 100, 100 - topPct)
                      const colorClass = STATUS_COLORS[b.status] ?? 'bg-slate-100 border-slate-400 text-slate-900'

                      return (
                        <button
                          key={b.id}
                          onClick={() => openBooking(b)}
                          className={`absolute inset-x-0.5 rounded border-l-2 px-1 py-0.5 text-left overflow-hidden ${colorClass} hover:opacity-90 transition-opacity`}
                          style={{ top: `${topPct}%`, height: `${heightPct}%` }}
                        >
                          <p className="text-xs font-medium truncate leading-tight">
                            {b.customers?.full_name ?? 'Unknown'}
                          </p>
                          <p className="text-xs truncate opacity-80">{b.service_name_snapshot}</p>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <BookingCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        staff={staff}
        businessId={businessId}
        timezone={timezone}
        onCreated={onBookingCreated}
      />

      <BookingDrawer
        booking={selectedBooking}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={onBookingUpdated}
        onCancelled={onBookingCancelled}
      />
    </div>
  )
}
