import { NextResponse } from 'next/server'
import { getPublicBusinessBySlug, getPublicStaffForService } from '@/modules/booking/public-queries'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const serviceId = searchParams.get('serviceId') ?? undefined

  const business = await getPublicBusinessBySlug(slug)
  if (!business) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const staff = await getPublicStaffForService(business.id, serviceId)
  return NextResponse.json(staff)
}
