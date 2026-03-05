import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'
import { OrgAccessGranteeType, OrgAccessPermission } from '@prisma/client'

const ORG_SCOPE_CACHE_TTL_MS = 30_000
const orgScopeCache = new Map<string, { expiresAt: number; value: UserOrgScope }>()

export interface UserOrgScope {
  viewableNodeIds: string[]
  editableNodeIds: string[]
}

export async function getUserOrgScope(userId: string, tenantId: string): Promise<UserOrgScope> {
  const cacheKey = `${tenantId}:${userId}`
  const now = Date.now()
  const cached = orgScopeCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  const [permissions, allNodes, memberships, userRoles, leaderNodes] = await Promise.all([
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
    prisma.orgNode.findMany({
      where: {
        tenantId,
        leaderUserId: userId,
      },
      select: { id: true },
    }),
  ])

  const allNodeIds = allNodes.map((node) => node.id)
  const allNodeIdSet = new Set(allNodeIds)
  const nodeById = new Map(allNodes.map((node) => [node.id, node]))

  if (permissions.canManageConfig) {
    const fullScope = {
      viewableNodeIds: allNodeIds,
      editableNodeIds: allNodeIds,
    }
    orgScopeCache.set(cacheKey, {
      expiresAt: now + ORG_SCOPE_CACHE_TTL_MS,
      value: fullScope,
    })
    return fullScope
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

  const collectAncestors = (startId: string) => {
    const result = new Set<string>()
    let current = nodeById.get(startId)

    while (current?.parentId) {
      result.add(current.parentId)
      current = nodeById.get(current.parentId)
    }

    return result
  }

  const directNodeIds = Array.from(
    new Set([
      ...memberships.map((membership) => membership.orgNodeId),
      ...leaderNodes.map((node) => node.id),
    ]),
  )
  const editable = new Set<string>()
  const viewable = new Set<string>()

  for (const nodeId of directNodeIds) {
    const editableSubtree = collectDescendants(nodeId)
    editableSubtree.forEach((id) => editable.add(id))
    editableSubtree.forEach((id) => viewable.add(id))
    const membershipAncestors = collectAncestors(nodeId)
    membershipAncestors.forEach((id) => viewable.add(id))
  }

  for (const grant of grants) {
    if (!allNodeIdSet.has(grant.orgNodeId)) continue

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

  const scope = {
    viewableNodeIds: Array.from(viewable),
    editableNodeIds: Array.from(editable),
  }

  orgScopeCache.set(cacheKey, {
    expiresAt: now + ORG_SCOPE_CACHE_TTL_MS,
    value: scope,
  })

  return scope
}
