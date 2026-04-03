'use client'

import { useTransition, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createBusinessAction } from './actions'

const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Vietnam (GMT+7)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (GMT+7)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
]

export default function OnboardingPage() {
  const [isPending, startTransition] = useTransition()
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh')

  function slugify(name: string) {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 63)
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const slugInput = document.getElementById('slug') as HTMLInputElement | null
    if (slugInput && !slugInput.dataset.edited) {
      slugInput.value = slugify(e.target.value)
    }
  }

  function handleSlugEdit(e: React.ChangeEvent<HTMLInputElement>) {
    e.currentTarget.dataset.edited = 'true'
    e.currentTarget.value = slugify(e.currentTarget.value)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('timezone', timezone)
    startTransition(async () => {
      const result = await createBusinessAction(formData)
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Set up your business</CardTitle>
          <CardDescription>
            This creates your public booking page. You can change everything later.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business name</Label>
              <Input
                id="name"
                name="name"
                placeholder="My Nail Salon"
                required
                onChange={handleNameChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Booking URL</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  bookease.app/b/
                </span>
                <Input
                  id="slug"
                  name="slug"
                  placeholder="my-nail-salon"
                  required
                  onChange={handleSlugEdit}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={(v) => v && setTimezone(v)}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+84 90 123 4567" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input id="address" name="address" placeholder="123 Nguyen Hue, District 1" />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create my booking page'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
