'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rescheduleByTokenAction } from './actions'

type Slot = { startAt: string; endAt: string; availableStaffIds: string[] }

export default function ReschedulePage({
  params,
}: {
  params: { slug: string; token: string }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'))
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [serviceId, setServiceId] = useState<string | null>(null)

  // Load serviceId from the current booking via the token
  useEffect(() => {
    fetch(`/api/public/${params.slug}/booking-by-token?token=${params.token}`)
      .then((r) => r.json())
      .then((d) => { if (d.serviceId) setServiceId(d.serviceId) })
      .catch(() => {})
  }, [params.slug, params.token])

  useEffect(() => {
    if (!serviceId || !date) return
    setLoadingSlots(true)
    setSlots([])
    setSelectedSlot(null)
    const p = new URLSearchParams({ serviceId, date })
    fetch(`/api/public/${params.slug}/slots?${p}`)
      .then((r) => r.json())
      .then((d) => { setSlots(Array.isArray(d) ? d : []) })
      .finally(() => setLoadingSlots(false))
  }, [serviceId, date, params.slug])

  function handleSubmit() {
    if (!selectedSlot) return
    startTransition(async () => {
      const result = await rescheduleByTokenAction(params.token, selectedSlot.startAt)
      if (result.error) { toast.error(result.error); return }
      toast.success('Booking rescheduled!')
      // Old token is dead — redirect to new token page
      router.push(`/b/${params.slug}/booking/${result.newToken}`)
    })
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl border max-w-sm w-full p-6 space-y-5">
        <h1 className="text-xl font-semibold">Reschedule booking</h1>
        <p className="text-sm text-muted-foreground">
          Choose a new date and time. Your current booking will be cancelled and a new one created.
        </p>

        <div className="space-y-2">
          <Label>New date</Label>
          <Input
            type="date"
            value={date}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {loadingSlots && <p className="text-sm text-muted-foreground">Loading times…</p>}

        {!loadingSlots && slots.length > 0 && (
          <div className="space-y-2">
            <Label>Available times</Label>
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => {
                const active = selectedSlot?.startAt === slot.startAt
                return (
                  <button
                    key={slot.startAt}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:border-primary'
                    }`}
                  >
                    {format(new Date(slot.startAt), 'HH:mm')}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!loadingSlots && slots.length === 0 && serviceId && (
          <p className="text-sm text-muted-foreground">No available times on this date.</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" className="flex-1" onClick={() => router.back()} disabled={isPending}>
            Go back
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={isPending || !selectedSlot}>
            {isPending ? 'Rescheduling…' : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  )
}
