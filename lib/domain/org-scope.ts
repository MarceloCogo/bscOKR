import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'
import { OrgAccessGranteeType, OrgAccessPermission } from '@prisma/client'

export interface UserOrgScope {
  viewableNodeIds: string[]
  editableNodeIds: string[]
}

export async function getUserOrgScope(userId: string, tenantId: string): Promise<UserOrgScope> {
  const [permissions, allNodes, memberships, userRoles] = await Promise.all([
    getUserPermissions(userId, tenantId),
    prisma.orgNode.findMany({
      where: { tenantId },
      select: { id: true, parentId: true },
    }),
    prisma.orgNodeMembership.findMany({
      where: { tenantId, userId },
      select: { orgNodeId: true },
    }),
    prisma.userRole.findMany({
      where: {
        userId,
        role: { tenantId },
      },
      select: { roleId: true },
    }),
  ])

  const allNodeIds = allNodes.map((node) => node.id)

  if (permissions.canManageConfig || permissions.canEditAll) {
    return {
      viewableNodeIds: allNodeIds,
      editableNodeIds: allNodeIds,
    }
  }

  const roleIds = userRoles.map((role) => role.roleId)
  const grants = await prisma.orgNodeAccessGrant.findMany({
    where: {
      tenantId,
      OR: [
        { granteeType: OrgAccessGranteeType.USER, granteeId: userId },
        ...(roleIds.length > 0
          ? [{ granteeType: OrgAccessGranteeType.ROLE, granteeId: { in: roleIds } }]
          : []),
      ],
    },
    select: {
      orgNodeId: true,
      permission: true,
      includeDescendants: true,
    },
  })

  const nodeById = new Map(allNodes.map((node) => [node.id, node]))
  const childrenByParent = new Map<string | null, string[]>()

  allNodes.forEach((node) => {
    const parentKey = node.parentId ?? null
    const current = childrenByParent.get(parentKey) || []
    current.push(node.id)
    childrenByParent.set(parentKey, current)
  })

  const collectDescendants = (rootId: string) => {
    const result = new Set<string>()
    const queue = [rootId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      result.add(currentId)
      const children = childrenByParent.get(currentId) || []
      queue.push(...children)
    }

    return result
  }

  const collectAncestors = (nodeId: string) => {
    const result = new Set<string>()
    let current = nodeById.get(nodeId)

    while (current?.parentId) {
      result.add(current.parentId)
      current = nodeById.get(current.parentId)
    }

    return result
  }

  const directNodeIds = memberships.map((membership) => membership.orgNodeId)
  const editable = new Set<string>()
  const viewable = new Set<string>()

  for (const nodeId of directNodeIds) {
    const editableSubtree = collectDescendants(nodeId)
    editableSubtree.forEach((id) => editable.add(id))
    editableSubtree.forEach((id) => viewable.add(id))
    collectAncestors(nodeId).forEach((id) => viewable.add(id))
  }

  for (const grant of grants) {
    if (!nodeById.has(grant.orgNodeId)) continue

    const grantedNodes = grant.includeDescendants
      ? collectDescendants(grant.orgNodeId)
      : new Set([grant.orgNodeId])

    if (grant.permission === OrgAccessPermission.VIEW) {
      grantedNodes.forEach((id) => viewable.add(id))
      collectAncestors(grant.orgNodeId).forEach((id) => viewable.add(id))
      continue
    }

    grantedNodes.forEach((id) => editable.add(id))
    grantedNodes.forEach((id) => viewable.add(id))
    collectAncestors(grant.orgNodeId).forEach((id) => viewable.add(id))
  }

  return {
    viewableNodeIds: Array.from(viewable),
    editableNodeIds: Array.from(editable),
  }
}
