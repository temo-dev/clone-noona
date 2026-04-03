import { Resend } from 'resend'
import { format, parseISO } from 'date-fns'
import { createSupabaseServiceClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = process.env.RESEND_FROM_EMAIL ?? 'bookings@example.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingEmailData = {
  bookingId:        string
  businessId:       string
  businessName:     string
  businessSlug:     string
  customerName:     string
  customerEmail:    string | null
  serviceName:      string
  durationMinutes:  number
  price:            number | null
  staffName:        string | null
  startAt:          string   // ISO
  endAt:            string   // ISO
  timezone:         string
  bookingToken:     string
  cancelReason?:    string | null
}

// ─── Idempotency helper ───────────────────────────────────────────────────────

/**
 * Insert a notification_log row (idempotent).
 * Returns true if this is a new send (proceed), false if already sent (skip).
 */
async function acquireSendSlot(
  bookingId: string,
  businessId: string,
  type: string
): Promise<{ id: string } | null> {
  const supabase = createSupabaseServiceClient()

  const { data, error } = await supabase
    .from('notification_logs')
    .insert({
      business_id: businessId,
      booking_id:  bookingId,
      type,
      channel:     'email',
      status:      'pending',
    })
    .select('id')
    .single()

  if (error) {
    // Unique constraint violation = already sent/in-progress — skip
    if (error.code === '23505') return null
    console.error('[notifications] acquireSendSlot error:', error.message)
    return null
  }
  return data
}

async function markSent(logId: string, sentTo: string) {
  const supabase = createSupabaseServiceClient()
  await supabase
    .from('notification_logs')
    .update({ status: 'sent', sent_to: sentTo })
    .eq('id', logId)
}

async function markFailed(logId: string) {
  const supabase = createSupabaseServiceClient()
  await supabase
    .from('notification_logs')
    .update({ status: 'failed' })
    .eq('id', logId)
}

// ─── Email helpers ────────────────────────────────────────────────────────────

function formatTime(iso: string, tz: string) {
  try {
    const { toZonedTime } = require('date-fns-tz') as typeof import('date-fns-tz')
    const zoned = toZonedTime(parseISO(iso), tz)
    return format(zoned, "EEEE, MMMM d yyyy 'at' HH:mm")
  } catch {
    return format(parseISO(iso), "EEEE, MMMM d yyyy 'at' HH:mm")
  }
}

function bookingLink(slug: string, token: string) {
  return `${APP_URL}/b/${slug}/booking/${token}`
}

// ─── booking_created ─────────────────────────────────────────────────────────

export async function sendBookingCreatedEmail(data: BookingEmailData): Promise<void> {
  if (!data.customerEmail) return

  const slot = await acquireSendSlot(data.bookingId, data.businessId, 'booking_created')
  if (!slot) return   // already sent

  const link = bookingLink(data.businessSlug, data.bookingToken)
  const time  = formatTime(data.startAt, data.timezone)

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      data.customerEmail,
    subject: `Booking confirmed — ${data.businessName}`,
    html: `
      <p>Hi ${data.customerName},</p>
      <p>Your booking at <strong>${data.businessName}</strong> has been received.</p>
      <table cellpadding="8" style="border-collapse:collapse;margin:16px 0">
        <tr><td><strong>Service</strong></td><td>${data.serviceName} (${data.durationMinutes} min${data.price != null ? ` · ${data.price.toLocaleString()}` : ''})</td></tr>
        <tr><td><strong>When</strong></td><td>${time}</td></tr>
        ${data.staffName ? `<tr><td><strong>With</strong></td><td>${data.staffName}</td></tr>` : ''}
      </table>
      <p><a href="${link}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">View / Manage booking</a></p>
      <p style="color:#888;font-size:12px">Use the link above to cancel if needed.</p>
    `,
  })

  if (error) {
    await markFailed(slot.id)
    console.error('[notifications] booking_created send failed:', error.message)
    return
  }
  await markSent(slot.id, data.customerEmail)
}

// ─── booking_confirmed ────────────────────────────────────────────────────────

export async function sendBookingConfirmedEmail(data: BookingEmailData): Promise<void> {
  if (!data.customerEmail) return

  const slot = await acquireSendSlot(data.bookingId, data.businessId, 'booking_confirmed')
  if (!slot) return

  const link = bookingLink(data.businessSlug, data.bookingToken)
  const time  = formatTime(data.startAt, data.timezone)

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      data.customerEmail,
    subject: `Booking confirmed ✓ — ${data.businessName}`,
    html: `
      <p>Hi ${data.customerName},</p>
      <p>Your booking at <strong>${data.businessName}</strong> has been <strong>confirmed</strong>!</p>
      <table cellpadding="8" style="border-collapse:collapse;margin:16px 0">
        <tr><td><strong>Service</strong></td><td>${data.serviceName} (${data.durationMinutes} min)</td></tr>
        <tr><td><strong>When</strong></td><td>${time}</td></tr>
        ${data.staffName ? `<tr><td><strong>With</strong></td><td>${data.staffName}</td></tr>` : ''}
      </table>
      <p><a href="${link}" style="background:#22c55e;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">View booking</a></p>
    `,
  })

  if (error) { await markFailed(slot.id); return }
  await markSent(slot.id, data.customerEmail)
}

// ─── booking_cancelled ────────────────────────────────────────────────────────

export async function sendBookingCancelledEmail(data: BookingEmailData): Promise<void> {
  if (!data.customerEmail) return

  const slot = await acquireSendSlot(data.bookingId, data.businessId, 'booking_cancelled')
  if (!slot) return

  const time = formatTime(data.startAt, data.timezone)

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      data.customerEmail,
    subject: `Booking cancelled — ${data.businessName}`,
    html: `
      <p>Hi ${data.customerName},</p>
      <p>Your booking at <strong>${data.businessName}</strong> has been cancelled.</p>
      <table cellpadding="8" style="border-collapse:collapse;margin:16px 0">
        <tr><td><strong>Service</strong></td><td>${data.serviceName}</td></tr>
        <tr><td><strong>Was scheduled</strong></td><td>${time}</td></tr>
        ${data.cancelReason ? `<tr><td><strong>Reason</strong></td><td>${data.cancelReason}</td></tr>` : ''}
      </table>
      <p>If you'd like to rebook, visit <a href="${APP_URL}/b/${data.businessSlug}">${data.businessName}</a>.</p>
    `,
  })

  if (error) { await markFailed(slot.id); return }
  await markSent(slot.id, data.customerEmail)
}

// ─── booking_reminder ─────────────────────────────────────────────────────────

export async function sendBookingReminderEmail(data: BookingEmailData): Promise<void> {
  if (!data.customerEmail) return

  const slot = await acquireSendSlot(data.bookingId, data.businessId, 'reminder')
  if (!slot) return   // already sent (cron ran twice)

  const link = bookingLink(data.businessSlug, data.bookingToken)
  const time  = formatTime(data.startAt, data.timezone)

  const { error } = await resend.emails.send({
    from:    FROM,
    to:      data.customerEmail,
    subject: `Reminder: your appointment tomorrow — ${data.businessName}`,
    html: `
      <p>Hi ${data.customerName},</p>
      <p>Just a reminder about your appointment tomorrow at <strong>${data.businessName}</strong>.</p>
      <table cellpadding="8" style="border-collapse:collapse;margin:16px 0">
        <tr><td><strong>Service</strong></td><td>${data.serviceName} (${data.durationMinutes} min)</td></tr>
        <tr><td><strong>When</strong></td><td>${time}</td></tr>
        ${data.staffName ? `<tr><td><strong>With</strong></td><td>${data.staffName}</td></tr>` : ''}
      </table>
      <p><a href="${link}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">View booking</a></p>
    `,
  })

  if (error) { await markFailed(slot.id); return }
  await markSent(slot.id, data.customerEmail)
}

// ─── Helper: build BookingEmailData from DB row ───────────────────────────────

export async function buildEmailData(bookingId: string): Promise<BookingEmailData | null> {
  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from('bookings')
    .select(`
      id, start_at, end_at, timezone, cancel_reason,
      service_name_snapshot, service_duration_minutes_snapshot,
      price_snapshot, staff_name_snapshot, booking_access_token, business_id,
      businesses!inner(name, slug),
      customers!inner(full_name, email)
    `)
    .eq('id', bookingId)
    .single()

  if (!data) return null

  const biz = data.businesses as { name: string; slug: string }
  const cust = data.customers as { full_name: string; email: string | null }

  return {
    bookingId:       data.id,
    businessId:      data.business_id,
    businessName:    biz.name,
    businessSlug:    biz.slug,
    customerName:    cust.full_name,
    customerEmail:   cust.email,
    serviceName:     data.service_name_snapshot,
    durationMinutes: data.service_duration_minutes_snapshot,
    price:           data.price_snapshot,
    staffName:       data.staff_name_snapshot,
    startAt:         data.start_at,
    endAt:           data.end_at,
    timezone:        data.timezone,
    bookingToken:    data.booking_access_token,
    cancelReason:    data.cancel_reason,
  }
}
