'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { upsertBusinessHoursAction } from '@/modules/business/actions'
import type { BusinessHours } from '@/modules/business/queries'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type HoursRow = {
  weekday: number
  is_closed: boolean
  start_time: string
  end_time: string
}

function defaultRows(saved: BusinessHours[]): HoursRow[] {
  return Array.from({ length: 7 }, (_, i) => {
    const existing = saved.find((h) => h.weekday === i)
    return existing
      ? {
          weekday: i,
          is_closed: existing.is_closed,
          start_time: existing.start_time.slice(0, 5),
          end_time: existing.end_time.slice(0, 5),
        }
      : { weekday: i, is_closed: i === 0 || i === 6, start_time: '09:00', end_time: '18:00' }
  })
}

export function AvailabilityForm({ savedHours }: { savedHours: BusinessHours[] }) {
  const [rows, setRows] = useState<HoursRow[]>(() => defaultRows(savedHours))
  const [isPending, startTransition] = useTransition()

  function updateRow(weekday: number, patch: Partial<HoursRow>) {
    setRows((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)))
  }

  function handleSave() {
    startTransition(async () => {
      const result = await upsertBusinessHoursAction(rows)
      if (result?.error) toast.error(result.error)
      else toast.success('Hours saved.')
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[120px_80px_1fr] gap-2 text-xs font-medium text-muted-foreground mb-1 px-1">
        <span>Day</span>
        <span>Open</span>
        <span>Hours</span>
      </div>

      {rows.map((row) => (
        <div
          key={row.weekday}
          className="grid grid-cols-[120px_80px_1fr] items-center gap-2 rounded-lg border px-3 py-3"
        >
          <span className="text-sm font-medium">{WEEKDAYS[row.weekday]}</span>

          <Switch
            checked={!row.is_closed}
            onCheckedChange={(open) => updateRow(row.weekday, { is_closed: !open })}
          />

          {row.is_closed ? (
            <span className="text-sm text-muted-foreground">Closed</span>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={row.start_time}
                onChange={(e) => updateRow(row.weekday, { start_time: e.target.value })}
                className="w-32 text-sm"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="time"
                value={row.end_time}
                onChange={(e) => updateRow(row.weekday, { end_time: e.target.value })}
                className="w-32 text-sm"
              />
            </div>
          )}
        </div>
      ))}

      <div className="pt-2">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save hours'}
        </Button>
      </div>
    </div>
  )
}
