'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cancelByTokenAction } from './actions'

export default function CancelPage({
  params,
}: {
  params: { slug: string; token: string }
}) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelByTokenAction(params.token, reason || undefined)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Booking cancelled.')
      router.push(`/b/${params.slug}/booking/${params.token}`)
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl border max-w-sm w-full p-6 space-y-4">
        <h1 className="text-xl font-semibold">Cancel booking</h1>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to cancel? This cannot be undone.
        </p>
        <div className="space-y-2">
          <Label>Reason (optional)</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Schedule conflict"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Go back
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleCancel}
            disabled={isPending}
          >
            {isPending ? 'Cancelling…' : 'Yes, cancel'}
          </Button>
        </div>
      </div>
    </div>
  )
}
