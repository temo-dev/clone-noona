'use server'

import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { createServiceAction } from '@/modules/business/actions'

export async function onboardingAddServiceAction(formData: FormData) {
  const result = await createServiceAction(formData)
  if (result?.error) return result
  redirect('/onboarding/ready')
}

export async function onboardingSkipServiceAction() {
  await getCurrentTenant()
  redirect('/onboarding/ready')
}
