import { NextResponse } from 'next/server'
import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { getBookingsForWeek } from '@/modules/booking/actions'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('weekStart')  // ISO string, Monday 00:00 UTC

    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart required' }, { status: 400 })
    }

    const bookings = await getBookingsForWeek(weekStart)
    return NextResponse.json(bookings)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
