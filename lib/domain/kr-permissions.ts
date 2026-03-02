import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'
import { getUserOrgScope } from '@/lib/domain/org-scope'

export async function canManageKR(userId: string, tenantId: string, orgNodeId: string) {
  const [permissions, scope, isLeader] = await Promise.all([
    getUserPermissions(userId, tenantId),
    getUserOrgScope(userId, tenantId),
    prisma.orgNode.count({
      where: { id: orgNodeId, tenantId, leaderUserId: userId },
    }),
  ])

  if (permissions.canManageConfig || permissions.canEditAll) return true
  if (scope.editableNodeIds.includes(orgNodeId)) return true

  return isLeader > 0
}
