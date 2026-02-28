import { prisma } from '@/lib/db'

export async function canManageKR(userId: string, tenantId: string, orgNodeId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  })

  const permissions = userRoles.flatMap((ur) => JSON.parse(ur.role.permissionsJson))
  const perms = permissions.reduce((acc, perm) => ({ ...acc, ...perm }), {}) as Record<string, boolean>
  if (perms.canManageConfig || perms.canEditAll) return true

  const isLeader = await prisma.orgNode.count({
    where: { id: orgNodeId, tenantId, leaderUserId: userId },
  })

  return isLeader > 0
}
