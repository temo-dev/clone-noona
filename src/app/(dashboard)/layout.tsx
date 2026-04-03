import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { logoutAction } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // getCurrentTenant handles unauthenticated + no-business redirects
  let tenant
  try {
    tenant = await getCurrentTenant()
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'business_suspended') {
      redirect('/login?error=suspended')
    }
    throw err
  }

  const supabase = await createSupabaseServerClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('name, slug')
    .eq('id', tenant.businessId)
    .single()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-background flex flex-col">
        <div className="p-4">
          <p className="font-semibold text-sm truncate">{business?.name ?? 'My Business'}</p>
          <p className="text-xs text-muted-foreground capitalize">{tenant.role}</p>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1">
          <NavItem href="/app/dashboard" label="Dashboard" />
          <NavItem href="/app/calendar" label="Calendar" />
          <NavItem href="/app/bookings" label="Bookings" />
          <Separator className="my-2" />
          <NavItem href="/app/settings/business" label="Business" />
          <NavItem href="/app/settings/availability" label="Availability" />
          <NavItem href="/app/settings/staff" label="Staff" />
          <NavItem href="/app/settings/services" label="Services" />
          {(tenant.role === 'owner' || tenant.role === 'manager') && (
            <NavItem href="/app/settings/members" label="Members" />
          )}
        </nav>
        <Separator />
        <div className="p-3">
          {business?.slug && (
            <a
              href={`/b/${business.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-muted-foreground hover:text-primary truncate mb-2"
            >
              /b/{business.slug}
            </a>
          )}
          <form action={logoutAction}>
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {label}
    </Link>
  )
}
