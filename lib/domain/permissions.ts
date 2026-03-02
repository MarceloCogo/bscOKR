import { prisma } from '@/lib/db'

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
  const userRoles = await prisma.userRole.findMany({
    where: {
      userId,
      user: { tenantId },
      role: { tenantId },
    },
    include: { role: true },
  })

  const merged = userRoles.reduce((acc, userRole) => {
    return { ...acc, ...parsePermissionsJson(userRole.role.permissionsJson) }
  }, {} as Partial<AppPermissions>)

  return normalizePermissions(merged)
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
