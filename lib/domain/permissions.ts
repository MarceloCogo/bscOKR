import { prisma } from '@/lib/db'
import { OrgAccessGranteeType } from '@prisma/client'

const PERMISSIONS_CACHE_TTL_MS = 30_000
const permissionsCache = new Map<string, { expiresAt: number; value: AppPermissions }>()

export interface AppPermissions {
  canManageUsers: boolean
  canManageConfig: boolean
  canViewAll: boolean
  canEditAll: boolean
  canViewStrategyMap: boolean
  canViewObjectives: boolean
  canViewKRs: boolean
}

const DEFAULT_PERMISSIONS: AppPermissions = {
  canManageUsers: false,
  canManageConfig: false,
  canViewAll: false,
  canEditAll: false,
  canViewStrategyMap: false,
  canViewObjectives: false,
  canViewKRs: false,
}

function parsePermissionsJson(value: string): Partial<AppPermissions> {
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Partial<AppPermissions>
  } catch {
    return {}
  }
}

export function normalizePermissions(raw: Partial<AppPermissions>): AppPermissions {
  const merged = { ...DEFAULT_PERMISSIONS, ...raw }
  const canViewFallback = merged.canViewAll || merged.canEditAll || merged.canManageConfig

  return {
    ...merged,
    canViewStrategyMap: merged.canViewStrategyMap || canViewFallback,
    canViewObjectives: merged.canViewObjectives || canViewFallback,
    canViewKRs: merged.canViewKRs || canViewFallback,
  }
}

export async function getUserPermissions(userId: string, tenantId: string): Promise<AppPermissions> {
  const cacheKey = `${tenantId}:${userId}`
  const now = Date.now()
  const cached = permissionsCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const [userRoles, membershipCount, leaderCount] = await Promise.all([
    prisma.userRole.findMany({
      where: {
        userId,
        user: { tenantId },
        role: { tenantId },
      },
      include: { role: true },
    }),
    prisma.orgNodeMembership.count({
      where: {
        tenantId,
        userId,
      },
    }),
    prisma.orgNode.count({
      where: {
        tenantId,
        leaderUserId: userId,
      },
    }),
  ])

  const roleIds = userRoles.map((userRole) => userRole.roleId)
  const grantCount = await prisma.orgNodeAccessGrant.count({
    where: {
      tenantId,
      OR: [
        { granteeType: OrgAccessGranteeType.USER, granteeId: userId },
        ...(roleIds.length > 0
          ? [{ granteeType: OrgAccessGranteeType.ROLE, granteeId: { in: roleIds } }]
          : []),
      ],
    },
  })

  const merged = userRoles.reduce((acc, userRole) => {
    return { ...acc, ...parsePermissionsJson(userRole.role.permissionsJson) }
  }, {} as Partial<AppPermissions>)

  const normalized = normalizePermissions(merged)

  if (membershipCount > 0 || leaderCount > 0 || grantCount > 0) {
    normalized.canViewStrategyMap = true
    normalized.canViewObjectives = true
    normalized.canViewKRs = true
  }

  permissionsCache.set(cacheKey, {
    expiresAt: now + PERMISSIONS_CACHE_TTL_MS,
    value: normalized,
  })

  return normalized
}

export async function requireUserPermissions(userId: string, tenantId: string) {
  return getUserPermissions(userId, tenantId)
}

export function canViewRoute(
  permissions: AppPermissions,
  route: 'strategyMap' | 'objectives' | 'krs'
) {
  if (route === 'strategyMap') return permissions.canViewStrategyMap
  if (route === 'objectives') return permissions.canViewObjectives
  return permissions.canViewKRs
}
