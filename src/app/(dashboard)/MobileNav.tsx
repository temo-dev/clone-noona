'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { logoutAction } from '@/app/(auth)/actions'

type Props = {
  businessName: string
  businessSlug: string | null
  role: string
  isOwnerOrManager: boolean
}

const NAV_MAIN = [
  { href: '/app/dashboard', label: 'Dashboard' },
  { href: '/app/analytics',  label: 'Analytics' },
  { href: '/app/calendar',   label: 'Calendar' },
  { href: '/app/bookings',   label: 'Bookings' },
]

const NAV_SETTINGS = [
  { href: '/app/settings/business',     label: 'Business' },
  { href: '/app/settings/availability', label: 'Availability' },
  { href: '/app/settings/staff',        label: 'Staff' },
  { href: '/app/settings/services',     label: 'Services' },
  { href: '/app/settings/members',      label: 'Members', ownerOnly: true },
]

export function MobileNav({ businessName, businessSlug, role, isOwnerOrManager }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-40">
        <p className="font-semibold text-sm truncate max-w-[180px]">{businessName}</p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="p-1.5 rounded-md hover:bg-accent"
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-background border-r z-40 flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm truncate">{businessName}</p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {NAV_MAIN.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <Separator className="my-2" />
          {NAV_SETTINGS.filter((item) => !item.ownerOnly || isOwnerOrManager).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-3">
          {businessSlug && (
            <a
              href={`/b/${businessSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-muted-foreground hover:text-primary truncate mb-2"
            >
              /b/{businessSlug}
            </a>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full text-left px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-accent transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
