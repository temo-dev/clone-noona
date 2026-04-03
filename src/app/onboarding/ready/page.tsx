import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function OnboardingReadyPage() {
  const tenant = await getCurrentTenant()
  const supabase = await createSupabaseServerClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('name, slug')
    .eq('id', tenant.businessId)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const bookingUrl = business?.slug ? `${appUrl}/b/${business.slug}` : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="text-5xl mb-2">🎉</div>
            <CardTitle className="text-2xl">Your booking page is ready!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground text-sm">
              {business?.name} is live. Share this link with your customers:
            </p>

            {bookingUrl && (
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-sm font-mono break-all text-primary">{bookingUrl}</p>
                <a
                  href={bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary mt-1 inline-block"
                >
                  Open your booking page →
                </a>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Suggested next steps
              </p>
              <ul className="text-sm space-y-1.5 text-muted-foreground">
                <li>• Set your business hours in <Link href="/app/settings/availability" className="text-primary hover:underline">Availability</Link></li>
                <li>• Add more services in <Link href="/app/settings/services" className="text-primary hover:underline">Services</Link></li>
                <li>• Add team members in <Link href="/app/settings/staff" className="text-primary hover:underline">Staff</Link></li>
              </ul>
            </div>

            <Button nativeButton={false} render={<Link href="/app/dashboard" />} className="w-full">
              Go to dashboard →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
