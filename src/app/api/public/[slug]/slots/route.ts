import { NextResponse } from 'next/server'
import { getPublicBusinessBySlug } from '@/modules/booking/public-queries'
import { getAvailableSlots } from '@/modules/booking/availability'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const serviceId = searchParams.get('serviceId')
  const staffId   = searchParams.get('staffId') ?? undefined
  const date      = searchParams.get('date')

  if (!serviceId || !date) {
    return NextResponse.json({ error: 'serviceId and date required' }, { status: 400 })
  }

  const business = await getPublicBusinessBySlug(slug)
  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  const slots = await getAvailableSlots({
    businessId: business.id,
    serviceId,
    staffId,
    date,
    timezone: business.timezone,
    client: createSupabaseServiceClient(),
  })

  return NextResponse.json(
    slots.map((s) => ({
      startAt: s.startAt.toISOString(),
      endAt:   s.endAt.toISOString(),
      availableStaffIds: s.availableStaffIds,
    }))
  )
}
