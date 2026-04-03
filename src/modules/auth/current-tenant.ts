import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type TenantContext = {
  businessId: string
  userId: string
  role: 'owner' | 'manager' | 'staff'
}

/**
 * Reads the current user's active business membership from the DB.
 * - Must only be called from Server Components or Server Actions.
 * - Redirects to /login if no session.
 * - Redirects to /onboarding if no active business membership.
 * - Throws 'business_suspended' if the business is inactive.
 *
 * Cached per request (React cache) — safe to call multiple times in one request.
 */
export const getCurrentTenant = cache(async (): Promise<TenantContext> => {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true })
    .limit(1)
    .single()

  if (!membership) {
    redirect('/onboarding')
  }

  // Verify business is active (separate query for type safety)
  const { data: business } = await supabase
    .from('businesses')
    .select('is_active')
    .eq('id', membership.business_id)
    .single()

  if (!business?.is_active) {
    throw new Error('business_suspended')
  }

  return {
    businessId: membership.business_id,
    userId: user.id,
    role: membership.role as TenantContext['role'],
  }
})

/**
 * Same as getCurrentTenant but returns null instead of redirecting.
 * Useful for pages that need to check membership without forcing redirect.
 */
export async function getCurrentTenantOrNull(): Promise<TenantContext | null> {
  try {
    return await getCurrentTenant()
  } catch {
    return null
  }
}
