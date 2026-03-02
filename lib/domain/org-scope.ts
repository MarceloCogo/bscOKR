import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'

export interface UserOrgScope {
  viewableNodeIds: string[]
  editableNodeIds: string[]
}

export async function getUserOrgScope(userId: string, tenantId: string): Promise<UserOrgScope> {
  const [permissions, allNodes, memberships] = await Promise.all([
    getUserPermissions(userId, tenantId),
    prisma.orgNode.findMany({
      where: { tenantId },
      select: { id: true, parentId: true },
    }),
    prisma.orgNodeMembership.findMany({
      where: { tenantId, userId },
      select: { orgNodeId: true },
    }),
  ])

  const allNodeIds = allNodes.map((node) => node.id)

  if (permissions.canManageConfig || permissions.canEditAll) {
    return {
      viewableNodeIds: allNodeIds,
      editableNodeIds: allNodeIds,
    }
  }

  const directNodeIds = memberships.map((membership) => membership.orgNodeId)
  const nodeById = new Map(allNodes.map((node) => [node.id, node]))
  const viewable = new Set<string>(directNodeIds)

  for (const nodeId of directNodeIds) {
    let current = nodeById.get(nodeId)
    while (current?.parentId) {
      viewable.add(current.parentId)
      current = nodeById.get(current.parentId)
    }
  }

  return {
    viewableNodeIds: Array.from(viewable),
    editableNodeIds: directNodeIds,
  }
}
