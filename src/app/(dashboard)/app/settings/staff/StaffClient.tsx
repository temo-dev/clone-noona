'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  createStaffAction,
  updateStaffAction,
  archiveStaffAction,
  restoreStaffAction,
  upsertStaffWorkingHoursAction,
  updateStaffServicesAction,
} from '@/modules/business/actions'
import type { Staff, Service } from '@/modules/business/queries'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const STAFF_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
]

type StaffForm = {
  displayName: string
  email: string
  phone: string
  colorCode: string
  bio: string
}

type HoursRow = {
  weekday: number
  is_off: boolean
  start_time: string
  end_time: string
}

const EMPTY_FORM: StaffForm = {
  displayName: '',
  email: '',
  phone: '',
  colorCode: '#6366f1',
  bio: '',
}

function staffToForm(s: Staff): StaffForm {
  return {
    displayName: s.display_name,
    email: s.email ?? '',
    phone: s.phone ?? '',
    colorCode: s.color_code,
    bio: s.bio ?? '',
  }
}

function defaultWorkingHours(): HoursRow[] {
  return Array.from({ length: 7 }, (_, i) => ({
    weekday: i,
    is_off: i === 0 || i === 6,
    start_time: '09:00',
    end_time: '18:00',
  }))
}

export function StaffClient({
  staffList: initial,
  services,
}: {
  staffList: Staff[]
  services: Service[]
}) {
  const [staffList, setStaffList] = useState(initial)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM)
  const [workingHours, setWorkingHours] = useState<HoursRow[]>(defaultWorkingHours)
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(staff: Staff) {
    setEditing(staff)
    setForm(staffToForm(staff))
    setDialogOpen(true)
  }

  function openDetails(staff: Staff) {
    setSelectedStaff(staff)
    setWorkingHours(defaultWorkingHours())
    setAssignedServiceIds([])
    setSheetOpen(true)
    // Load existing hours + services from server
    loadStaffDetails(staff.id)
  }

  async function loadStaffDetails(staffId: string) {
    const res = await fetch(`/api/staff/${staffId}/details`)
    if (!res.ok) return
    const data = await res.json()
    if (data.workingHours) {
      setWorkingHours((prev) =>
        prev.map((row) => {
          const saved = data.workingHours.find((h: HoursRow) => h.weekday === row.weekday)
          return saved
            ? { ...row, is_off: saved.is_off, start_time: saved.start_time.slice(0, 5), end_time: saved.end_time.slice(0, 5) }
            : row
        })
      )
    }
    if (data.serviceIds) setAssignedServiceIds(data.serviceIds)
  }

  function field(key: keyof StaffForm) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    }
  }

  function updateHoursRow(weekday: number, patch: Partial<HoursRow>) {
    setWorkingHours((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)))
  }

  function handleSubmitProfile(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData()
    Object.entries(form).forEach(([k, v]) => formData.set(k, v))

    startTransition(async () => {
      const result = editing
        ? await updateStaffAction(editing.id, formData)
        : await createStaffAction(formData)

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(editing ? 'Staff updated.' : 'Staff member added.')
      setDialogOpen(false)

      if (editing) {
        setStaffList((prev) =>
          prev.map((s) =>
            s.id === editing.id
              ? {
                  ...s,
                  display_name: form.displayName,
                  email: form.email || null,
                  phone: form.phone || null,
                  color_code: form.colorCode,
                  bio: form.bio || null,
                }
              : s
          )
        )
      } else {
        window.location.reload()
      }
    })
  }

  function handleSaveHours() {
    if (!selectedStaff) return
    startTransition(async () => {
      const result = await upsertStaffWorkingHoursAction(selectedStaff.id, workingHours)
      if (result?.error) toast.error(result.error)
      else toast.success('Working hours saved.')
    })
  }

  function handleSaveServices() {
    if (!selectedStaff) return
    startTransition(async () => {
      const result = await updateStaffServicesAction(selectedStaff.id, assignedServiceIds)
      if (result?.error) toast.error(result.error)
      else toast.success('Services updated.')
    })
  }

  function handleArchive(staff: Staff) {
    startTransition(async () => {
      const result = await archiveStaffAction(staff.id)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('Staff archived.')
        setStaffList((prev) => prev.map((s) => (s.id === staff.id ? { ...s, is_active: false } : s)))
      }
    })
  }

  function handleRestore(staff: Staff) {
    startTransition(async () => {
      const result = await restoreStaffAction(staff.id)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('Staff restored.')
        setStaffList((prev) => prev.map((s) => (s.id === staff.id ? { ...s, is_active: true } : s)))
      }
    })
  }

  function toggleService(serviceId: string) {
    setAssignedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  const activeStaff = staffList.filter((s) => s.is_active)
  const archivedStaff = staffList.filter((s) => !s.is_active)

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}>Add staff</Button>
      </div>

      <div className="space-y-2">
        {activeStaff.map((s) => (
          <StaffRow
            key={s.id}
            staff={s}
            onDetails={() => openDetails(s)}
            onEdit={() => openEdit(s)}
            onArchive={() => handleArchive(s)}
            isPending={isPending}
          />
        ))}
        {activeStaff.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No staff yet. Add your first team member.
          </p>
        )}
      </div>

      {archivedStaff.length > 0 && (
        <div className="mt-8">
          <p className="text-sm font-medium text-muted-foreground mb-2">Archived</p>
          <div className="space-y-2">
            {archivedStaff.map((s) => (
              <StaffRow
                key={s.id}
                staff={s}
                onRestore={() => handleRestore(s)}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit staff' : 'Add staff member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...field('displayName')} placeholder="Nguyen Thi B" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input {...field('email')} type="email" placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input {...field('phone')} type="tel" placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea {...field('bio')} placeholder="Short bio" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {STAFF_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-7 h-7 rounded-full ring-offset-2 transition-all"
                    style={{
                      backgroundColor: color,
                      outline: form.colorCode === color ? `2px solid ${color}` : 'none',
                      outlineOffset: '2px',
                    }}
                    onClick={() => setForm((prev) => ({ ...prev, colorCode: color }))}
                  />
                ))}
              </div>
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

      {/* Working hours + services sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedStaff?.display_name} — Schedule & services</SheetTitle>
          </SheetHeader>

          <div className="mt-6">
            <Tabs defaultValue="hours">
              <TabsList className="mb-4">
                <TabsTrigger value="hours">Working hours</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
              </TabsList>

              <TabsContent value="hours" className="space-y-3">
                <div className="grid grid-cols-[100px_80px_1fr] gap-2 text-xs font-medium text-muted-foreground mb-1 px-1">
                  <span>Day</span>
                  <span>Working</span>
                  <span>Hours</span>
                </div>
                {workingHours.map((row) => (
                  <div
                    key={row.weekday}
                    className="grid grid-cols-[100px_80px_1fr] items-center gap-2 rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm">{WEEKDAYS[row.weekday]}</span>
                    <Switch
                      checked={!row.is_off}
                      onCheckedChange={(on) => updateHoursRow(row.weekday, { is_off: !on })}
                    />
                    {row.is_off ? (
                      <span className="text-sm text-muted-foreground">Day off</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={row.start_time}
                          onChange={(e) => updateHoursRow(row.weekday, { start_time: e.target.value })}
                          className="w-28 text-sm"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="time"
                          value={row.end_time}
                          onChange={(e) => updateHoursRow(row.weekday, { end_time: e.target.value })}
                          className="w-28 text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={handleSaveHours} disabled={isPending} className="mt-2">
                  {isPending ? 'Saving…' : 'Save hours'}
                </Button>
              </TabsContent>

              <TabsContent value="services" className="space-y-3">
                <p className="text-sm text-muted-foreground mb-3">
                  Select which services this staff member can perform.
                </p>
                {services.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No active services. Add services first.
                  </p>
                )}
                {services.map((service) => (
                  <div key={service.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                    <Checkbox
                      id={`svc-${service.id}`}
                      checked={assignedServiceIds.includes(service.id)}
                      onCheckedChange={() => toggleService(service.id)}
                    />
                    <Label htmlFor={`svc-${service.id}`} className="flex-1 cursor-pointer">
                      <span className="font-medium text-sm">{service.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {service.duration_minutes} min
                      </span>
                    </Label>
                  </div>
                ))}
                <Separator />
                <Button onClick={handleSaveServices} disabled={isPending}>
                  {isPending ? 'Saving…' : 'Save services'}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function StaffRow({
  staff,
  onDetails,
  onEdit,
  onArchive,
  onRestore,
  isPending,
}: {
  staff: Staff
  onDetails?: () => void
  onEdit?: () => void
  onArchive?: () => void
  onRestore?: () => void
  isPending: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex-shrink-0"
          style={{ backgroundColor: staff.color_code }}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{staff.display_name}</span>
            {!staff.is_active && (
              <Badge variant="secondary" className="text-xs">
                Archived
              </Badge>
            )}
          </div>
          {staff.email && (
            <p className="text-xs text-muted-foreground">{staff.email}</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {onDetails && (
          <Button variant="ghost" size="sm" onClick={onDetails} disabled={isPending}>
            Schedule
          </Button>
        )}
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
