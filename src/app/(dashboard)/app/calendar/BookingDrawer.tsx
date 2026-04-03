'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  updateBookingStatusAction,
  cancelBookingAction,
} from '@/modules/booking/actions'
import type { BookingRow } from './types'

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:   { label: 'Pending',   variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  completed: { label: 'Completed', variant: 'outline' },
  no_show:   { label: 'No-show',   variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

export function BookingDrawer({
  booking,
  open,
  onOpenChange,
  onUpdated,
  onCancelled,
}: {
  booking: BookingRow | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onUpdated: (b: BookingRow) => void
  onCancelled: (id: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [cancelReason, setCancelReason] = useState('')

  if (!booking) return null

  const b = booking
  const statusInfo = STATUS_BADGE[b.status] ?? { label: b.status, variant: 'secondary' as const }

  function handleStatus(newStatus: 'confirmed' | 'completed' | 'no_show') {
    startTransition(async () => {
      const result = await updateBookingStatusAction(b.id, newStatus)
      if (result?.error) { toast.error(result.error); return }
      toast.success(`Booking ${newStatus}.`)
      onUpdated({ ...b, status: newStatus })
    })
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelBookingAction(b.id, cancelReason || undefined)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Booking cancelled.')
      onCancelled(b.id)
    })
  }

  const startLocal = parseISO(b.start_at)
  const endLocal   = parseISO(b.end_at)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Booking
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Customer */}
          <Section label="Customer">
            <p className="font-medium">{b.customers?.full_name ?? 'Unknown'}</p>
            {b.customers?.email && <p className="text-sm text-muted-foreground">{b.customers.email}</p>}
            {b.customers?.phone && <p className="text-sm text-muted-foreground">{b.customers.phone}</p>}
          </Section>

          <Separator />

          {/* Service (snapshot) */}
          <Section label="Service">
            <p className="font-medium">{b.service_name_snapshot}</p>
            <p className="text-sm text-muted-foreground">
              {b.service_duration_minutes_snapshot} min
              {b.price_snapshot != null && ` · ${b.price_snapshot.toLocaleString()}`}
            </p>
          </Section>

          <Separator />

          {/* Time */}
          <Section label="Time">
            <p className="font-medium">{format(startLocal, 'EEEE, MMM d, yyyy')}</p>
            <p className="text-sm text-muted-foreground">
              {format(startLocal, 'HH:mm')} – {format(endLocal, 'HH:mm')}
            </p>
          </Section>

          <Separator />

          {/* Staff */}
          {b.staff_name_snapshot && (
            <>
              <Section label="Staff">
                <p className="font-medium">{b.staff_name_snapshot}</p>
              </Section>
              <Separator />
            </>
          )}

          {/* Notes */}
          {b.notes && (
            <>
              <Section label="Notes">
                <p className="text-sm">{b.notes}</p>
              </Section>
              <Separator />
            </>
          )}

          {/* Actions */}
          {b.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => handleStatus('confirmed')} disabled={isPending}>
                Confirm
              </Button>
              <CancelDialog
                onConfirm={handleCancel}
                reason={cancelReason}
                onReasonChange={setCancelReason}
                isPending={isPending}
              />
            </div>
          )}

          {b.status === 'confirmed' && (
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" variant="outline" onClick={() => handleStatus('completed')} disabled={isPending}>
                Complete
              </Button>
              <Button variant="outline" onClick={() => handleStatus('no_show')} disabled={isPending}>
                No-show
              </Button>
              <CancelDialog
                onConfirm={handleCancel}
                reason={cancelReason}
                onReasonChange={setCancelReason}
                isPending={isPending}
              />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  )
}

function CancelDialog({
  onConfirm,
  reason,
  onReasonChange,
  isPending,
}: {
  onConfirm: () => void
  reason: string
  onReasonChange: (v: string) => void
  isPending: boolean
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" disabled={isPending} />}>
        Cancel
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel booking</AlertDialogTitle>
          <AlertDialogDescription>
            This will cancel the booking. Optionally provide a reason.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label>Reason (optional)</Label>
          <Input
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. Customer requested"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Go back</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Yes, cancel booking</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
