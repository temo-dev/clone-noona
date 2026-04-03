import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// ─── In-process rate limiter for public booking submit ────────────────────────
// Limits: 10 requests / 60s per IP on /b/*/book (POST).
// NOTE: In-memory — resets per Vercel Edge instance. For multi-instance production,
// replace with Vercel KV or Upstash Redis.

type RateBucket = { count: number; resetAt: number }
const rateBuckets = new Map<string, RateBucket>()

const RATE_LIMIT      = 10   // max requests per window
const RATE_WINDOW_MS  = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }

  if (bucket.count >= RATE_LIMIT) return true

  bucket.count += 1
  return false
}

// ─── Proxy handler ────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { method } = request

  // Rate-limit POST to public booking wizard (server actions fire as POST)
  if (method === 'POST' && /^\/b\/[^/]+\/book/.test(pathname)) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (isRateLimited(ip)) {
      return new NextResponse('Too many requests. Please wait a moment.', { status: 429 })
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
