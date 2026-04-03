'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BookingDrawer } from '../calendar/BookingDrawer'
import { updateBookingStatusAction, cancelBookingAction } from '@/modules/booking/actions'
import type { BookingRow } from '../calendar/types'

const STATUS_OPTIONS = [
  { value: 'all',       label: 'All statuses' },
  { value: 'pending',   label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show',   label: 'No-show' },
]

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending:   'secondary',
  confirmed: 'default',
  completed: 'outline',
  no_show:   'outline',
  cancelled: 'destructive',
}

export function BookingsClient({ initialBookings }: { initialBookings: BookingRow[] }) {
  const [bookings, setBookings] = useState<BookingRow[]>(initialBookings)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  function openBooking(b: BookingRow) {
    setSelectedBooking(b)
    setDrawerOpen(true)
  }

  function onUpdated(updated: BookingRow) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
    setSelectedBooking(updated)
  }

  function onCancelled(id: string) {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b))
    )
    setDrawerOpen(false)
  }

  const filtered = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const name = b.customers?.full_name?.toLowerCase() ?? ''
      const service = b.service_name_snapshot.toLowerCase()
      const staff = b.staff_name_snapshot?.toLowerCase() ?? ''
      if (!name.includes(q) && !service.includes(q) && !staff.includes(q)) return false
    }
    return true
  })

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Search customer, service, staff…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Staff</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr
                key={b.id}
                className="border-t hover:bg-muted/30 cursor-pointer"
                onClick={() => openBooking(b)}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <p>{format(parseISO(b.start_at), 'MMM d')}</p>
                  <p className="text-muted-foreground text-xs">{format(parseISO(b.start_at), 'HH:mm')}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{b.customers?.full_name ?? '—'}</p>
                  {b.customers?.phone && (
                    <p className="text-xs text-muted-foreground">{b.customers.phone}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p>{b.service_name_snapshot}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.service_duration_minutes_snapshot} min
                    {b.price_snapshot != null && ` · ${b.price_snapshot.toLocaleString()}`}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {b.staff_name_snapshot ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={STATUS_BADGE[b.status] ?? 'secondary'}>
                    {b.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openBooking(b) }}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {filtered.map((b) => (
          <button
            key={b.id}
            onClick={() => openBooking(b)}
            className="w-full text-left border rounded-xl p-4 bg-background hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{b.customers?.full_name ?? '—'}</p>
                <p className="text-sm text-muted-foreground">{b.service_name_snapshot}</p>
              </div>
              <Badge variant={STATUS_BADGE[b.status] ?? 'secondary'} className="shrink-0">
                {b.status}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{format(parseISO(b.start_at), 'MMM d · HH:mm')}</span>
              {b.staff_name_snapshot && <span>{b.staff_name_snapshot}</span>}
              <span>{b.service_duration_minutes_snapshot} min</span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-10">No bookings found.</p>
        )}
      </div>

      <BookingDrawer
        booking={selectedBooking}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdated={onUpdated}
        onCancelled={onCancelled}
      />
    </>
  )
}
