/**
 * Edge Function: send-reminders
 * Called by pg_cron every 15 minutes.
 * Finds confirmed bookings starting 23–25h from now and sends reminder emails.
 *
 * Idempotent: UNIQUE (booking_id, type='reminder') on notification_logs prevents
 * double-sends even if the function runs twice in the same window.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@4'
import { format } from 'npm:date-fns@4'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
)

const resend  = new Resend(Deno.env.get('RESEND_API_KEY'))
const FROM    = Deno.env.get('RESEND_FROM_EMAIL') ?? 'bookings@example.com'
const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://example.com'

Deno.serve(async (req) => {
  // Verify Bearer token matches service role key (pg_cron passes it in header)
  const auth = req.headers.get('Authorization') ?? ''
  const expected = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
  if (auth !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  const now    = new Date()
  const from   = new Date(now.getTime() + 23 * 60 * 60 * 1000)   // now + 23h
  const to     = new Date(now.getTime() + 25 * 60 * 60 * 1000)   // now + 25h

  // Fetch confirmed bookings in the reminder window
  const { data: bookings, error: fetchErr } = await supabase
    .from('bookings')
    .select(`
      id, start_at, end_at, timezone,
      service_name_snapshot, service_duration_minutes_snapshot,
      price_snapshot, staff_name_snapshot, booking_access_token, business_id,
      businesses!inner(name, slug),
      customers!inner(full_name, email)
    `)
    .eq('status', 'confirmed')
    .gte('start_at', from.toISOString())
    .lte('start_at', to.toISOString())

  if (fetchErr) {
    console.error('fetch error:', fetchErr.message)
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500 })
  }

  const results = { sent: 0, skipped: 0, failed: 0 }

  for (const b of bookings ?? []) {
    const biz  = b.businesses  as { name: string; slug: string }
    const cust = b.customers   as { full_name: string; email: string | null }

    if (!cust.email) { results.skipped++; continue }

    // Acquire idempotency slot — ON CONFLICT DO NOTHING
    const { data: logRow, error: logErr } = await supabase
      .from('notification_logs')
      .insert({
        business_id: b.business_id,
        booking_id:  b.id,
        type:        'reminder',
        channel:     'email',
        status:      'pending',
      })
      .select('id')
      .single()

    if (logErr) {
      // code 23505 = unique violation = already sent
      if (logErr.code === '23505') { results.skipped++; continue }
      console.error('log insert error:', logErr.message)
      results.failed++
      continue
    }

    // Format time in business timezone (best-effort)
    let timeStr = ''
    try {
      const { toZonedTime } = await import('npm:date-fns-tz@3')
      const zoned = toZonedTime(new Date(b.start_at), b.timezone)
      timeStr = format(zoned, "EEEE, MMMM d 'at' HH:mm")
    } catch {
      timeStr = format(new Date(b.start_at), "EEEE, MMMM d 'at' HH:mm") + ' UTC'
    }

    const link = `${APP_URL}/b/${biz.slug}/booking/${b.booking_access_token}`

    const { error: sendErr } = await resend.emails.send({
      from,
      to:      cust.email,
      subject: `Reminder: your appointment tomorrow — ${biz.name}`,
      html: `
        <p>Hi ${cust.full_name},</p>
        <p>Just a reminder about your appointment tomorrow at <strong>${biz.name}</strong>.</p>
        <table cellpadding="8" style="border-collapse:collapse;margin:16px 0">
          <tr><td><strong>Service</strong></td><td>${b.service_name_snapshot} (${b.service_duration_minutes_snapshot} min)</td></tr>
          <tr><td><strong>When</strong></td><td>${timeStr}</td></tr>
          ${b.staff_name_snapshot ? `<tr><td><strong>With</strong></td><td>${b.staff_name_snapshot}</td></tr>` : ''}
        </table>
        <p><a href="${link}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">View booking</a></p>
      `,
    })

    if (sendErr) {
      await supabase.from('notification_logs').update({ status: 'failed' }).eq('id', logRow.id)
      console.error('send error for booking', b.id, sendErr.message)
      results.failed++
      continue
    }

    await supabase
      .from('notification_logs')
      .update({ status: 'sent', sent_to: cust.email })
      .eq('id', logRow.id)

    results.sent++
  }

  console.log('send-reminders complete:', results)
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  })
})
