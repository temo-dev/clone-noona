import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getPublicBusinessBySlug, getPublicServices, getPublicStaffForService } from '@/modules/booking/public-queries'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const business = await getPublicBusinessBySlug(slug)
  if (!business) return {}
  return { title: `${business.name} — Book an appointment` }
}

export default async function PublicBusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const business = await getPublicBusinessBySlug(slug)
  if (!business) notFound()

  const [services, staff] = await Promise.all([
    getPublicServices(business.id),
    getPublicStaffForService(business.id),
  ])

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Hero */}
      <div className="bg-background border-b">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold">{business.name}</h1>
          {business.description && (
            <p className="mt-2 text-muted-foreground">{business.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
            {business.phone && <span>{business.phone}</span>}
            {business.address && <span>{business.address}</span>}
          </div>
          <div className="mt-6">
            <Button size="lg" render={<Link href={`/b/${slug}/book`} />}>
              Book an appointment
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Services */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Services</h2>
          <div className="space-y-3">
            {services.map((s) => (
              <div key={s.id} className="bg-background rounded-xl border px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{s.name}</p>
                  {s.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {s.duration_minutes} min
                    {s.price != null && ` · ${s.price.toLocaleString('vi-VN')}đ`}
                  </p>
                </div>
                <Button variant="outline" size="sm" render={<Link href={`/b/${slug}/book?serviceId=${s.id}`} />}>
                  Book
                </Button>
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-muted-foreground text-sm">No services available yet.</p>
            )}
          </div>
        </section>

        {/* Staff */}
        {staff.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Our team</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {staff.map((s) => (
                <div key={s.id} className="bg-background rounded-xl border p-4 text-center">
                  <div
                    className="w-12 h-12 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: s.color_code }}
                  />
                  <p className="font-medium text-sm">{s.display_name}</p>
                  {s.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.bio}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
