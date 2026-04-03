import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { getServiceList } from '@/modules/business/queries'
import { ServicesClient } from './ServicesClient'

export default async function ServicesPage() {
  const tenant = await getCurrentTenant()
  const services = await getServiceList(tenant.businessId)

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">Services</h1>
      <ServicesClient services={services} />
    </div>
  )
}
