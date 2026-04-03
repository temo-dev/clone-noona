import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { logoutAction } from '@/app/(auth)/actions'
import { Separator } from '@/components/ui/separator'
import { MobileNav } from './MobileNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  const isOwnerOrManager = tenant.role === 'owner' || tenant.role === 'manager'

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 border-r bg-background flex-col shrink-0">
        <div className="p-4">
          <p className="font-semibold text-sm truncate">{business?.name ?? 'My Business'}</p>
          <p className="text-xs text-muted-foreground capitalize">{tenant.role}</p>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1">
          <NavItem href="/app/dashboard" label="Dashboard" />
          <NavItem href="/app/analytics"  label="Analytics" />
          <NavItem href="/app/calendar"   label="Calendar" />
          <NavItem href="/app/bookings"   label="Bookings" />
          <Separator className="my-2" />
          <NavItem href="/app/settings/business"     label="Business" />
          <NavItem href="/app/settings/availability" label="Availability" />
          <NavItem href="/app/settings/staff"        label="Staff" />
          <NavItem href="/app/settings/services"     label="Services" />
          {isOwnerOrManager && (
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
            <button
              type="submit"
              className="w-full text-left px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile navigation */}
      <MobileNav
        businessName={business?.name ?? 'My Business'}
        businessSlug={business?.slug ?? null}
        role={tenant.role}
        isOwnerOrManager={isOwnerOrManager}
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
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
