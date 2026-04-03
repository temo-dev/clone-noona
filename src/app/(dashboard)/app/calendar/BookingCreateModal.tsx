'use client'

import { useState, useTransition, useEffect } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createBookingAction } from '@/modules/booking/actions'
import type { Staff, Service } from '@/modules/business/queries'
import type { BookingRow } from './types'

type SlotOption = { startAt: string; endAt: string; availableStaffIds: string[] }

export function BookingCreateModal({
  open,
  onOpenChange,
  staff,
  businessId,
  timezone,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  staff: Staff[]
  businessId: string
  timezone: string
  onCreated: (b: BookingRow) => void
}) {
  const [isPending, startTransition] = useTransition()

  // Step 1 — service + staff + date
  const [services, setServices] = useState<Service[]>([])
  const [serviceId, setServiceId] = useState('')
  const [staffId, setStaffId] = useState('any')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))

  // Step 2 — time slot
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<SlotOption | null>(null)

  // Step 3 — customer
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')

  // Load services when modal opens
  useEffect(() => {
    if (!open) return
    fetch(`/api/businesses/services`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setServices(data) })
      .catch(() => {})
    setServiceId('')
    setStaffId('any')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setSlots([])
    setSelectedSlot(null)
    setCustomerName('')
    setCustomerEmail('')
    setCustomerPhone('')
    setNotes('')
  }, [open, businessId])

  async function loadSlots() {
    if (!serviceId || !date) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    try {
      const params = new URLSearchParams({ serviceId, date })
      if (staffId !== 'any') params.set('staffId', staffId)
      const res = await fetch(`/api/bookings/slots?${params}`)
      const data = await res.json()
      setSlots(Array.isArray(data) ? data : [])
    } finally {
      setLoadingSlots(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot) return

    const resolvedStaffId = staffId !== 'any' ? staffId : undefined

    startTransition(async () => {
      const result = await createBookingAction({
        serviceId,
        staffId: resolvedStaffId,
        startAt: selectedSlot.startAt,
        customerName,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success('Booking created.')
      onCreated(result.booking as unknown as BookingRow)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service */}
          <div className="space-y-2">
            <Label>Service</Label>
            <Select value={serviceId} onValueChange={(v) => v && setServiceId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.duration_minutes} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Staff */}
          <div className="space-y-2">
            <Label>Staff</Label>
            <Select value={staffId} onValueChange={(v) => v && setStaffId(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any available</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={loadSlots} disabled={!serviceId || loadingSlots}>
                {loadingSlots ? 'Loading…' : 'Check slots'}
              </Button>
            </div>
          </div>

          {/* Time slots */}
          {slots.length > 0 && (
            <div className="space-y-2">
              <Label>Time</Label>
              <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                {slots.map((slot) => {
                  const label = format(new Date(slot.startAt), 'HH:mm')
                  const active = selectedSlot?.startAt === slot.startAt
                  return (
                    <button
                      key={slot.startAt}
                      type="button"
                      className={`rounded border px-2 py-1 text-sm transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setSelectedSlot(slot)}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {slots.length === 0 && !loadingSlots && serviceId && date && (
            <p className="text-sm text-muted-foreground">No available slots for this day.</p>
          )}

          {/* Customer */}
          <div className="space-y-2">
            <Label>Customer name</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nguyen Thi C"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !selectedSlot || !customerName}>
              {isPending ? 'Creating…' : 'Create booking'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
