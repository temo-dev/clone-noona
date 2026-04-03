import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { getBusinessHours } from '@/modules/business/queries'
import { AvailabilityForm } from './AvailabilityForm'

export default async function AvailabilityPage() {
  const tenant = await getCurrentTenant()
  const hours = await getBusinessHours(tenant.businessId)

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">Business hours</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Set your opening hours per day. Bookings outside these hours will be rejected.
      </p>
      <AvailabilityForm savedHours={hours} />
    </div>
  )
}
