import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { getAvailableSlots } from '@/modules/booking/availability'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('serviceId')
    const staffId   = searchParams.get('staffId') ?? undefined
    const date      = searchParams.get('date')     // YYYY-MM-DD

    if (!serviceId || !date) {
      return NextResponse.json({ error: 'serviceId and date required' }, { status: 400 })
    }

    const tenant = await getCurrentTenant()

    const supabase = await createSupabaseServerClient()
    const { data: biz } = await supabase
      .from('businesses')
      .select('timezone')
      .eq('id', tenant.businessId)
      .single()

    if (!biz) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const slots = await getAvailableSlots({
      businessId: tenant.businessId,
      serviceId,
      staffId,
      date,
      timezone: biz.timezone,
    })

    return NextResponse.json(
      slots.map((s) => ({
        startAt: s.startAt.toISOString(),
        endAt:   s.endAt.toISOString(),
        availableStaffIds: s.availableStaffIds,
      }))
    )
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
