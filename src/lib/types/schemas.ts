import { z } from 'zod'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

// ─── Business ────────────────────────────────────────────────────────────────

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const createBusinessSchema = z.object({
  name: z.string().min(2, 'Business name is required').max(100),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(63)
    .regex(SLUG_REGEX, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  timezone: z.string().min(1, 'Timezone is required'),
  phone: z.string().max(30).optional(),
  address: z.string().max(200).optional(),
})

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>

// ─── Staff ───────────────────────────────────────────────────────────────────

export const createStaffSchema = z.object({
  displayName: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#6366f1'),
  bio: z.string().max(500).optional(),
})

export type CreateStaffInput = z.infer<typeof createStaffSchema>

// ─── Service ─────────────────────────────────────────────────────────────────

export const createServiceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().positive('Duration must be positive'),
  bufferBeforeMinutes: z.number().int().min(0).default(0),
  bufferAfterMinutes: z.number().int().min(0).default(0),
  price: z.number().min(0).optional(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>

// ─── Booking (public submit) ──────────────────────────────────────────────────

export const publicBookingSchema = z.object({
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().optional(), // undefined = "any available"
  startAt: z.string().datetime(),
  timezone: z.string().min(1),
  customerName: z.string().min(2).max(100),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
  turnstileToken: z.string().min(1, 'Anti-spam check required'),
})

export type PublicBookingInput = z.infer<typeof publicBookingSchema>
