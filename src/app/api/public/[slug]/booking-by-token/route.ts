import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/server'
import { getPublicBusinessBySlug } from '@/modules/booking/public-queries'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const business = await getPublicBusinessBySlug(slug)
  if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('bookings')
    .select('service_id, status')
    .eq('booking_access_token', token)
    .eq('business_id', business.id)
    .single()

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ serviceId: data.service_id, status: data.status })
}
