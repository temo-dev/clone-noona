import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { getStaffWorkingHours, getStaffServiceIds } from '@/modules/business/queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ staffId: string }> }
) {
  try {
    const { staffId } = await params
    const tenant = await getCurrentTenant()

    // Verify staff belongs to this business
    const supabase = await createSupabaseServerClient()
    const { data: staffRow } = await supabase
      .from('staff')
      .select('id')
      .eq('id', staffId)
      .eq('business_id', tenant.businessId)
      .single()

    if (!staffRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [workingHours, serviceIds] = await Promise.all([
      getStaffWorkingHours(staffId),
      getStaffServiceIds(staffId),
    ])

    return NextResponse.json({ workingHours, serviceIds })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
