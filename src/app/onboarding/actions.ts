'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createBusinessSchema } from '@/lib/types/schemas'

export async function createBusinessAction(formData: FormData) {
  const raw = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    timezone: formData.get('timezone'),
    phone: formData.get('phone') || undefined,
    address: formData.get('address') || undefined,
  }

  const parsed = createBusinessSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check slug availability
  const { data: existing } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', parsed.data.slug)
    .single()

  if (existing) {
    return { error: 'This URL is already taken. Please choose a different one.' }
  }

  // Insert business
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      timezone: parsed.data.timezone,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
    })
    .select('id')
    .single()

  if (bizError || !business) {
    return { error: 'Failed to create business. Please try again.' }
  }

  // Add owner as business_member
  const { error: memberError } = await supabase.from('business_members').insert({
    business_id: business.id,
    user_id: user.id,
    role: 'owner',
    status: 'active',
    joined_at: new Date().toISOString(),
  })

  if (memberError) {
    // Rollback the business insert to avoid orphaned data
    await supabase.from('businesses').delete().eq('id', business.id)
    return { error: 'Failed to set up your account. Please try again.' }
  }

  redirect('/app/dashboard')
}
