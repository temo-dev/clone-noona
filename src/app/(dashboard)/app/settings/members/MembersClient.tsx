'use client'

import { useState, useTransition } from 'react'
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
import {
  inviteMemberAction,
  removeMemberAction,
  updateMemberRoleAction,
} from '@/modules/business/actions'

export type MemberRow = {
  id: string
  user_id: string
  role: string
  status: string
  joined_at: string | null
  profile: { full_name: string | null; email: string | null } | null
}

export function MembersClient({
  members,
  isOwner,
}: {
  members: MemberRow[]
  isOwner: boolean
}) {
  const [email, setEmail]     = useState('')
  const [role, setRole]       = useState('staff')
  const [isPending, start]    = useTransition()

  function handleInvite() {
    start(async () => {
      const result = await inviteMemberAction(email, role)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('Member added.')
        setEmail('')
      }
    })
  }

  function handleRemove(id: string) {
    start(async () => {
      const result = await removeMemberAction(id)
      if (result?.error) toast.error(result.error)
      else toast.success('Member removed.')
    })
  }

  function handleRoleChange(id: string, newRole: string) {
    start(async () => {
      const result = await updateMemberRoleAction(id, newRole)
      if (result?.error) toast.error(result.error)
      else toast.success('Role updated.')
    })
  }

  const active = members.filter((m) => m.status === 'active')

  return (
    <div className="space-y-8">
      {/* Current members */}
      <section>
        <h2 className="text-sm font-medium mb-3">Current members</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team members yet.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {active.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.profile?.full_name ?? m.profile?.email ?? 'Unknown'}
                  </p>
                  {m.profile?.email && (
                    <p className="text-xs text-muted-foreground truncate">{m.profile.email}</p>
                  )}
                </div>
                {m.role === 'owner' ? (
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted">
                    Owner
                  </span>
                ) : isOwner ? (
                  <Select
                    defaultValue={m.role}
                    onValueChange={(v) => v && handleRoleChange(m.id, v)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs capitalize text-muted-foreground">{m.role}</span>
                )}
                {m.role !== 'owner' && isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => handleRemove(m.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add member — owner only */}
      {isOwner && (
        <section>
          <h2 className="text-sm font-medium mb-3">Add team member</h2>
          <p className="text-xs text-muted-foreground mb-3">
            The person must already have an account. Enter their email address.
          </p>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <Label htmlFor="member-email" className="sr-only">Email</Label>
              <Input
                id="member-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Select value={role} onValueChange={(v) => v && setRole(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={isPending || !email}>
              Add member
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
