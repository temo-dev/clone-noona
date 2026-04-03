import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPublicBusinessBySlug, getPublicServices } from '@/modules/booking/public-queries'
import { BookingWizard } from './BookingWizard'

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ serviceId?: string }>
}) {
  const { slug } = await params
  const { serviceId: preselectedServiceId } = await searchParams

  const business = await getPublicBusinessBySlug(slug)
  if (!business) notFound()

  const services = await getPublicServices(business.id)
  if (services.length === 0) notFound()

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="bg-background border-b">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/b/${slug}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← {business.name}
          </Link>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-8">
        <BookingWizard
          slug={slug}
          businessName={business.name}
          timezone={business.timezone}
          services={services}
          preselectedServiceId={preselectedServiceId}
        />
      </div>
    </div>
  )
}
