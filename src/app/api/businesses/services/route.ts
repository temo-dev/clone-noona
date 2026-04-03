import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { getActiveServices } from '@/modules/business/queries'

export async function GET() {
  try {
    const tenant = await getCurrentTenant()
    const services = await getActiveServices(tenant.businessId)
    return NextResponse.json(services)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
