'use server'

import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/modules/auth/current-tenant'
import { createStaffAction } from '@/modules/business/actions'

export async function onboardingAddStaffAction(formData: FormData) {
  // Creates staff using existing action, then redirects to service step
  const result = await createStaffAction(formData)
  if (result?.error) return result
  redirect('/onboarding/service')
}

export async function onboardingSkipStaffAction() {
  await getCurrentTenant() // ensure still logged in
  redirect('/onboarding/service')
}
