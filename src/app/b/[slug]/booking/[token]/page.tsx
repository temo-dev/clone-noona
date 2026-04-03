import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getPublicBookingByToken } from '@/modules/booking/public-queries'

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending:   { text: 'Pending confirmation', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  confirmed: { text: 'Confirmed',            color: 'bg-green-50 text-green-700 border-green-200' },
  completed: { text: 'Completed',            color: 'bg-gray-50 text-gray-600 border-gray-200' },
  cancelled: { text: 'Cancelled',            color: 'bg-red-50 text-red-700 border-red-200' },
  no_show:   { text: 'No-show',              color: 'bg-gray-50 text-gray-600 border-gray-200' },
}

export default async function BookingConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>
}) {
  const { slug, token } = await params
  const booking = await getPublicBookingByToken(token)
  if (!booking) notFound()

  const business = booking.businesses as { name: string; slug: string; phone: string | null; address: string | null }
  const customer = booking.customers as { full_name: string; email: string | null; phone: string | null }
  const statusInfo = STATUS_LABEL[booking.status] ?? { text: booking.status, color: 'bg-gray-100 text-gray-600 border-gray-200' }

  const start = parseISO(booking.start_at)
  const end   = parseISO(booking.end_at)
  const isCancellable = booking.status === 'pending' || booking.status === 'confirmed'

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="bg-background border-b">
        <div className="max-w-lg mx-auto px-4 py-4">
          <Link href={`/b/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← {business.name}
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Status banner */}
        <div className={`rounded-xl border px-5 py-4 ${statusInfo.color}`}>
          <p className="font-semibold text-lg">{statusInfo.text}</p>
          {booking.status === 'pending' && (
            <p className="text-sm mt-1 opacity-80">
              Your booking is awaiting confirmation from {business.name}.
            </p>
          )}
          {booking.status === 'confirmed' && (
            <p className="text-sm mt-1 opacity-80">See you soon!</p>
          )}
          {booking.status === 'cancelled' && booking.cancel_reason && (
            <p className="text-sm mt-1 opacity-80">Reason: {booking.cancel_reason}</p>
          )}
        </div>

        {/* Booking details */}
        <div className="bg-background rounded-xl border divide-y">
          <DetailRow label="Service" value={booking.service_name_snapshot} />
          <DetailRow
            label="Duration"
            value={`${booking.service_duration_minutes_snapshot} min${
              booking.price_snapshot != null ? ` · ${booking.price_snapshot.toLocaleString('vi-VN')}đ` : ''
            }`}
          />
          <DetailRow label="Date" value={format(start, 'EEEE, MMMM d, yyyy')} />
          <DetailRow label="Time" value={`${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`} />
          {booking.staff_name_snapshot && (
            <DetailRow label="Staff" value={booking.staff_name_snapshot} />
          )}
          <DetailRow label="Name" value={customer.full_name} />
          {customer.email && <DetailRow label="Email" value={customer.email} />}
          {customer.phone && <DetailRow label="Phone" value={customer.phone} />}
          {booking.notes && <DetailRow label="Notes" value={booking.notes} />}
        </div>

        {/* Business info */}
        <div className="bg-background rounded-xl border px-5 py-4 text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">{business.name}</p>
          {business.phone   && <p>{business.phone}</p>}
          {business.address && <p>{business.address}</p>}
        </div>

        {/* Actions */}
        {isCancellable && (
          <div className="space-y-2 pt-2">
            <Button
              className="w-full"
              render={<Link href={`/b/${slug}/booking/${token}/reschedule`} />}
            >
              Reschedule
            </Button>
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              render={<Link href={`/b/${slug}/booking/${token}/cancel`} />}
            >
              Cancel this booking
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between px-5 py-3 gap-4">
      <span className="text-sm text-muted-foreground flex-shrink-0 w-24">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  )
}
