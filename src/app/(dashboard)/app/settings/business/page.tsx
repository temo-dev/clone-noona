import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { getBusiness } from '@/modules/business/queries'
import { BusinessSettingsForm } from './BusinessSettingsForm'

export default async function BusinessSettingsPage() {
  const tenant = await getCurrentTenant()
  const business = await getBusiness(tenant.businessId)
  if (!business) return null

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Business settings</h1>
      <BusinessSettingsForm business={business} />
    </div>
  )
}
