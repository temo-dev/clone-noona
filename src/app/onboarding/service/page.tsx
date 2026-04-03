'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { onboardingAddServiceAction, onboardingSkipServiceAction } from './actions'

export default function OnboardingServicePage() {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await onboardingAddServiceAction(formData)
      if (result?.error) toast.error(result.error)
    })
  }

  function handleSkip() {
    startTransition(async () => {
      await onboardingSkipServiceAction()
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-4">
        <StepIndicator current={3} total={3} />
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Add your first service</CardTitle>
            <CardDescription>
              For example: Manicure, Haircut, Massage. You can add more later.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service name</Label>
                <Input id="name" name="name" placeholder="Classic Manicure" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Nail shaping, cuticle care, and polish"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="durationMinutes">Duration (min)</Label>
                  <Input
                    id="durationMinutes"
                    name="durationMinutes"
                    type="number"
                    min={5}
                    step={5}
                    defaultValue={60}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (optional)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="25.00"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Saving…' : 'Add service & finish →'}
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
