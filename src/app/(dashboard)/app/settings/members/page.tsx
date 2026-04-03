import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { requireRole } from '@/modules/auth/role-guard'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MembersClient, type MemberRow } from './MembersClient'
import { redirect } from 'next/navigation'

export default async function MembersPage() {
  let tenant
  try {
    tenant = await getCurrentTenant()
    requireRole(tenant, ['owner', 'manager'])
  } catch {
    redirect('/app/dashboard')
  }

  const supabase = await createSupabaseServerClient()

  const { data: members } = await supabase
    .from('business_members')
    .select('id, user_id, role, status, joined_at')
    .eq('business_id', tenant.businessId)
    .in('status', ['active'])
    .order('joined_at', { ascending: true })

  // Fetch profiles for each member
  const userIds = (members ?? []).map((m) => m.user_id)
  const { data: profiles } = userIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
    : { data: [] }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))

  const rows: MemberRow[] = (members ?? []).map((m) => ({
    ...m,
    profile: profileMap.get(m.user_id) ?? null,
  }))

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Team members</h1>
      <MembersClient members={rows} isOwner={tenant.role === 'owner'} />
    </div>
  )
}
