import type { TenantContext } from './current-tenant'

type Role = TenantContext['role']

/**
 * Throws an error if the current member's role is not in the allowed list.
 * Call this at the top of server actions that are role-restricted.
 *
 * Example:
 *   const tenant = await getCurrentTenant()
 *   requireRole(tenant, ['owner', 'manager'])
 */
export function requireRole(tenant: TenantContext, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(tenant.role)) {
    throw new Error('unauthorized')
  }
}

export function isOwnerOrManager(tenant: TenantContext): boolean {
  return tenant.role === 'owner' || tenant.role === 'manager'
}

export function isOwner(tenant: TenantContext): boolean {
  return tenant.role === 'owner'
}
