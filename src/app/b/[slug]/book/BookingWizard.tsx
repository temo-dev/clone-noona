'use client'

import { useState, useTransition, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitPublicBooking } from '../actions'
import type { PublicService, PublicStaff } from '@/modules/booking/public-queries'

type Slot = { startAt: string; endAt: string; availableStaffIds: string[] }

type WizardState = {
  step: 1 | 2 | 3 | 4
  service: PublicService | null
  staffId: string   // uuid or 'any'
  staff: PublicStaff[]
  date: string      // YYYY-MM-DD
  slot: Slot | null
  slots: Slot[]
  loadingSlots: boolean
  // Customer
  name: string
  email: string
  phone: string
  notes: string
}

const STEP_LABELS = ['Service', 'Staff', 'Date & Time', 'Your info']

export function BookingWizard({
  slug,
  businessName,
  timezone,
  services,
  preselectedServiceId,
}: {
  slug: string
  businessName: string
  timezone: string
  services: PublicService[]
  preselectedServiceId?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const initial = preselectedServiceId
    ? services.find((s) => s.id === preselectedServiceId) ?? null
    : null

  const [state, setState] = useState<WizardState>({
    step: initial ? 2 : 1,
    service: initial,
    staffId: 'any',
    staff: [],
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    slot: null,
    slots: [],
    loadingSlots: false,
    name: '', email: '', phone: '', notes: '',
  })

  function patch(updates: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...updates }))
  }

  // Fetch staff when service is selected
  useEffect(() => {
    if (!state.service) return
    fetch(`/api/public/${slug}/staff?serviceId=${state.service.id}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) patch({ staff: data }) })
      .catch(() => {})
  }, [state.service?.id, slug])

  // Fetch slots when date/service/staff changes (step 3)
  useEffect(() => {
    if (state.step !== 3 || !state.service || !state.date) return
    patch({ loadingSlots: true, slots: [], slot: null })
    const params = new URLSearchParams({ serviceId: state.service.id, date: state.date })
    if (state.staffId !== 'any') params.set('staffId', state.staffId)
    fetch(`/api/public/${slug}/slots?${params}`)
      .then((r) => r.json())
      .then((data) => patch({ slots: Array.isArray(data) ? data : [], loadingSlots: false }))
      .catch(() => patch({ loadingSlots: false }))
  }, [state.step, state.service?.id, state.date, state.staffId, slug])

  function handleSubmit() {
    if (!state.service || !state.slot || !state.name) return
    startTransition(async () => {
      const result = await submitPublicBooking({
        slug,
        serviceId: state.service!.id,
        staffId: state.staffId !== 'any' ? state.staffId : undefined,
        startAt: state.slot!.startAt,
        customerName: state.name,
        customerEmail: state.email || undefined,
        customerPhone: state.phone || undefined,
        notes: state.notes || undefined,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      router.push(`/b/${slug}/booking/${result.bookingToken}`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4
          const active = n === state.step
          const done   = n < state.step
          return (
            <div key={n} className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
                  done   ? 'bg-primary text-primary-foreground' :
                  active ? 'bg-primary text-primary-foreground' :
                           'bg-muted text-muted-foreground'
                }`}
              >
                {done ? '✓' : n}
              </div>
              <span className={`text-sm ${active ? 'font-medium' : 'text-muted-foreground'} hidden sm:block`}>
                {label}
              </span>
              {i < 3 && <span className="text-muted-foreground mx-1">›</span>}
            </div>
          )
        })}
      </div>

      {/* ── Step 1: Service ── */}
      {state.step === 1 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Choose a service</h2>
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => patch({ service: s, step: 2 })}
              className="w-full text-left rounded-xl border bg-background px-5 py-4 hover:border-primary hover:shadow-sm transition-all"
            >
              <p className="font-medium">{s.name}</p>
              {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
              <p className="text-sm text-muted-foreground mt-1">
                {s.duration_minutes} min
                {s.price != null && ` · ${s.price.toLocaleString('vi-VN')}đ`}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* ── Step 2: Staff ── */}
      {state.step === 2 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Choose a staff member</h2>
          <button
            onClick={() => patch({ staffId: 'any', step: 3 })}
            className={`w-full text-left rounded-xl border bg-background px-5 py-4 hover:border-primary hover:shadow-sm transition-all ${state.staffId === 'any' ? 'border-primary' : ''}`}
          >
            <p className="font-medium">Any available</p>
            <p className="text-sm text-muted-foreground">We'll assign the best available staff</p>
          </button>

          {state.staff.map((s) => (
            <button
              key={s.id}
              onClick={() => patch({ staffId: s.id, step: 3 })}
              className={`w-full text-left rounded-xl border bg-background px-5 py-4 hover:border-primary hover:shadow-sm transition-all flex items-center gap-4 ${state.staffId === s.id ? 'border-primary' : ''}`}
            >
              <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: s.color_code }} />
              <div>
                <p className="font-medium">{s.display_name}</p>
                {s.bio && <p className="text-sm text-muted-foreground line-clamp-1">{s.bio}</p>}
              </div>
            </button>
          ))}

          <Button variant="ghost" onClick={() => patch({ step: 1 })} className="w-full">
            ← Back
          </Button>
        </div>
      )}

      {/* ── Step 3: Date & Time ── */}
      {state.step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Pick a date & time</h2>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={state.date}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => patch({ date: e.target.value })}
              className="max-w-xs"
            />
          </div>

          {state.loadingSlots && (
            <p className="text-sm text-muted-foreground">Loading available times…</p>
          )}

          {!state.loadingSlots && state.slots.length > 0 && (
            <div className="space-y-2">
              <Label>Available times</Label>
              <div className="grid grid-cols-4 gap-2">
                {state.slots.map((slot) => {
                  const active = state.slot?.startAt === slot.startAt
                  return (
                    <button
                      key={slot.startAt}
                      onClick={() => patch({ slot })}
                      className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:border-primary hover:bg-accent'
                      }`}
                    >
                      {format(new Date(slot.startAt), 'HH:mm')}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {!state.loadingSlots && state.slots.length === 0 && state.date && (
            <p className="text-sm text-muted-foreground">
              No available times on this date. Try another day.
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => patch({ step: 2 })}>
              ← Back
            </Button>
            <Button
              onClick={() => patch({ step: 4 })}
              disabled={!state.slot}
              className="flex-1"
            >
              Continue →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Customer info ── */}
      {state.step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your information</h2>

          {/* Booking summary */}
          <div className="rounded-xl bg-muted/40 border px-4 py-3 text-sm space-y-1">
            <p><span className="font-medium">{state.service?.name}</span></p>
            <p className="text-muted-foreground">
              {state.slot && format(new Date(state.slot.startAt), 'EEEE, MMM d · HH:mm')}
            </p>
            {state.staffId !== 'any' && state.staff.length > 0 && (
              <p className="text-muted-foreground">
                with {state.staff.find((s) => s.id === state.staffId)?.display_name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full name *</Label>
            <Input
              id="name"
              value={state.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Nguyen Thi C"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={state.email}
                onChange={(e) => patch({ email: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={state.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={state.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Anything we should know?"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => patch({ step: 3 })}>
              ← Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !state.name}
              className="flex-1"
            >
              {isPending ? 'Booking…' : 'Confirm booking'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
