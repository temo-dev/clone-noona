'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { onboardingAddStaffAction, onboardingSkipStaffAction } from './actions'

export default function OnboardingStaffPage() {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await onboardingAddStaffAction(formData)
      if (result?.error) toast.error(result.error)
    })
  }

  function handleSkip() {
    startTransition(async () => {
      await onboardingSkipStaffAction()
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        <StepIndicator current={2} total={3} />
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Add your first staff member</CardTitle>
            <CardDescription>
              This could be yourself or a colleague. You can add more later.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jane@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" name="phone" type="tel" placeholder="+84 90 123 4567" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Saving…' : 'Add staff & continue →'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                disabled={isPending}
                onClick={handleSkip}
              >
                Skip for now
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
              step < current
                ? 'bg-primary text-primary-foreground'
                : step === current
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {step < current ? '✓' : step}
          </div>
          {step < total && <div className={`w-8 h-0.5 ${step < current ? 'bg-primary' : 'bg-muted'}`} />}
        </div>
      ))}
    </div>
  )
}
