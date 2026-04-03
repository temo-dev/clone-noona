import { createSupabaseServerClient } from '@/lib/supabase/server'

type CustomerInput = {
  businessId: string
  fullName: string
  email?: string | null
  phone?: string | null
}

/**
 * Deterministic customer lookup / upsert.
 * Priority: email match → phone match → create new.
 * If email and phone resolve to DIFFERENT records, email wins (conflict logged, no auto-merge).
 */
export async function upsertCustomer(input: CustomerInput): Promise<string> {
  const { businessId, fullName, email, phone } = input
  const supabase = await createSupabaseServerClient()

  // Lookup by email
  let byEmail = null
  if (email) {
    const { data } = await supabase
      .from('customers')
      .select('id, email, phone')
      .eq('business_id', businessId)
      .eq('email', email)
      .single()
    byEmail = data
  }

  // Lookup by phone
  let byPhone = null
  if (phone) {
    const { data } = await supabase
      .from('customers')
      .select('id, email, phone')
      .eq('business_id', businessId)
      .eq('phone', phone)
      .single()
    byPhone = data
  }

  // Conflict: email and phone point to different customers — email wins
  if (byEmail && byPhone && byEmail.id !== byPhone.id) {
    console.warn(
      `[customer-upsert] conflict: email→${byEmail.id} phone→${byPhone.id} — using email record`
    )
  }

  const existing = byEmail ?? byPhone

  if (existing) {
    // Patch missing fields if we now have them
    const patch: Record<string, string> = {}
    if (!existing.email && email) patch.email = email
    if (!existing.phone && phone) patch.phone = phone
    if (Object.keys(patch).length > 0) {
      await supabase.from('customers').update(patch).eq('id', existing.id)
    }
    return existing.id
  }

  // Create new customer
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert({ business_id: businessId, full_name: fullName, email: email ?? null, phone: phone ?? null })
    .select('id')
    .single()

  if (error || !newCustomer) throw new Error('Failed to create customer')
  return newCustomer.id
}
