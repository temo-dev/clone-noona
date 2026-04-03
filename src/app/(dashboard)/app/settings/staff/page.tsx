import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { getStaffList, getActiveServices } from '@/modules/business/queries'
import { StaffClient } from './StaffClient'

export default async function StaffPage() {
  const tenant = await getCurrentTenant()
  const [staffList, services] = await Promise.all([
    getStaffList(tenant.businessId),
    getActiveServices(tenant.businessId),
  ])

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-6">Staff</h1>
      <StaffClient staffList={staffList} services={services} />
    </div>
  )
}
