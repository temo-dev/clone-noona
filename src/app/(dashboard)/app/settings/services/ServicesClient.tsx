'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  createServiceAction,
  updateServiceAction,
  archiveServiceAction,
  restoreServiceAction,
} from '@/modules/business/actions'
import type { Service } from '@/modules/business/queries'

type ServiceForm = {
  name: string
  description: string
  durationMinutes: string
  bufferBeforeMinutes: string
  bufferAfterMinutes: string
  price: string
}

const EMPTY_FORM: ServiceForm = {
  name: '',
  description: '',
  durationMinutes: '60',
  bufferBeforeMinutes: '0',
  bufferAfterMinutes: '0',
  price: '',
}

function serviceToForm(s: Service): ServiceForm {
  return {
    name: s.name,
    description: s.description ?? '',
    durationMinutes: String(s.duration_minutes),
    bufferBeforeMinutes: String(s.buffer_before_minutes),
    bufferAfterMinutes: String(s.buffer_after_minutes),
    price: s.price != null ? String(s.price) : '',
  }
}

export function ServicesClient({ services: initial }: { services: Service[] }) {
  const [services, setServices] = useState(initial)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(service: Service) {
    setEditing(service)
    setForm(serviceToForm(service))
    setDialogOpen(true)
  }

  function field(key: keyof ServiceForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData()
    Object.entries(form).forEach(([k, v]) => formData.set(k, v))

    startTransition(async () => {
      const result = editing
        ? await updateServiceAction(editing.id, formData)
        : await createServiceAction(formData)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(editing ? 'Service updated.' : 'Service created.')
      setDialogOpen(false)

      // Optimistic update
      if (editing) {
        setServices((prev) =>
          prev.map((s) =>
            s.id === editing.id
              ? {
                  ...s,
                  name: form.name,
                  description: form.description || null,
                  duration_minutes: Number(form.durationMinutes),
                  buffer_before_minutes: Number(form.bufferBeforeMinutes),
                  buffer_after_minutes: Number(form.bufferAfterMinutes),
                  price: form.price ? Number(form.price) : null,
                }
              : s
          )
        )
      } else {
        // Reload after create (no id available)
        window.location.reload()
      }
    })
  }

  function handleArchive(service: Service) {
    startTransition(async () => {
      const result = await archiveServiceAction(service.id)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('Service archived.')
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, is_active: false } : s))
        )
      }
    })
  }

  function handleRestore(service: Service) {
    startTransition(async () => {
      const result = await restoreServiceAction(service.id)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('Service restored.')
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, is_active: true } : s))
        )
      }
    })
  }

  const active = services.filter((s) => s.is_active)
  const archived = services.filter((s) => !s.is_active)

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}>Add service</Button>
      </div>

      <div className="space-y-2">
        {active.map((s) => (
          <ServiceRow
            key={s.id}
            service={s}
            onEdit={() => openEdit(s)}
            onArchive={() => handleArchive(s)}
            isPending={isPending}
          />
        ))}
        {active.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No services yet. Add your first service to get started.
          </p>
        )}
      </div>

      {archived.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-medium text-muted-foreground mb-2">Archived</p>
          <div className="space-y-2">
            {archived.map((s) => (
              <ServiceRow
                key={s.id}
                service={s}
                onRestore={() => handleRestore(s)}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit service' : 'Add service'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...field('name')} placeholder="Gel Manicure" required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...field('description')} placeholder="Optional description" rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input {...field('durationMinutes')} type="number" min="5" step="5" required />
              </div>
              <div className="space-y-2">
                <Label>Buffer before</Label>
                <Input {...field('bufferBeforeMinutes')} type="number" min="0" step="5" />
              </div>
              <div className="space-y-2">
                <Label>Buffer after</Label>
                <Input {...field('bufferAfterMinutes')} type="number" min="0" step="5" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price (optional)</Label>
              <Input {...field('price')} type="number" min="0" step="0.01" placeholder="e.g. 250000" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : editing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ServiceRow({
  service,
  onEdit,
  onArchive,
  onRestore,
  isPending,
}: {
  service: Service
  onEdit?: () => void
  onArchive?: () => void
  onRestore?: () => void
  isPending: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{service.name}</span>
          {!service.is_active && (
            <Badge variant="secondary" className="text-xs">
              Archived
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {service.duration_minutes} min
          {service.buffer_before_minutes > 0 && ` · ${service.buffer_before_minutes}m before`}
          {service.buffer_after_minutes > 0 && ` · ${service.buffer_after_minutes}m after`}
          {service.price != null && ` · ${service.price.toLocaleString()}`}
        </p>
      </div>
      <div className="flex gap-2 ml-4">
        {onEdit && (
          <Button variant="ghost" size="sm" onClick={onEdit} disabled={isPending}>
            Edit
          </Button>
        )}
        {onArchive && (
          <Button variant="ghost" size="sm" onClick={onArchive} disabled={isPending}>
            Archive
          </Button>
        )}
        {onRestore && (
          <Button variant="ghost" size="sm" onClick={onRestore} disabled={isPending}>
            Restore
          </Button>
        )}
      </div>
    </div>
  )
}
