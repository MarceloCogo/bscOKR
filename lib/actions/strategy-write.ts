'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

// Helper to get user permissions
async function getUserPermissions(userId: string, tenantId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  })

  const permissions = userRoles.flatMap(ur => JSON.parse(ur.role.permissionsJson))
  return permissions.reduce((acc, perm) => ({ ...acc, ...perm }), {})
}

// Helper to check if user can manage objectives
async function canManageObjectives(userId: string, tenantId: string, orgNodeId?: string) {
  const perms = await getUserPermissions(userId, tenantId)
  if (perms.canManageConfig || perms.canEditAll) return true

  // Check if user is leader of the org node
  if (orgNodeId) {
    const isLeader = await prisma.orgNode.count({
      where: { id: orgNodeId, leaderUserId: userId },
    })
    if (isLeader > 0) return true
  }

  return false
}

// Helper to get active org node
async function getActiveOrgNode(userId: string, tenantId: string) {
  const pref = await prisma.userPreference.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  })

  return pref?.activeOrgNodeId
}

// Helper to get active context or throw
async function getActiveContextOrThrow(userId: string, tenantId: string) {
  const activeOrgNodeId = await getActiveOrgNode(userId, tenantId)
  if (!activeOrgNodeId) {
    const error = new Error('NO_ACTIVE_CONTEXT')
    ;(error as any).code = 'NO_ACTIVE_CONTEXT'
    throw error
  }
  return activeOrgNodeId
}

// Upsert strategy map meta
export async function upsertStrategyMapMeta(data: { ambitionText?: string; valuePropositionText?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const activeOrgNodeId = await getActiveContextOrThrow(session.user.id, session.user.tenantId)

  // DEV-only logging for consistency checking
  if (process.env.NODE_ENV === 'development') {
    console.debug('[upsertStrategyMapMeta] Save operation:', {
      tenantId: session.user.tenantId,
      activeOrgNodeId,
      data
    })
  }

  // Check permissions
  const userRoles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: true },
  })
  const permissions = userRoles.flatMap(ur => JSON.parse(ur.role.permissionsJson))
  const perms = permissions.reduce((acc, perm) => ({ ...acc, ...perm }), {})
  if (!perms.canManageConfig && !perms.canEditAll) {
    throw new Error('Insufficient permissions')
  }

  const result = await prisma.strategyMapMeta.upsert({
    where: {
      tenantId_orgNodeId: {
        tenantId: session.user.tenantId,
        orgNodeId: activeOrgNodeId,
      },
    },
    update: data,
    create: {
      tenantId: session.user.tenantId,
      orgNodeId: activeOrgNodeId,
      ...data,
    },
  })

  revalidatePath('/app/strategy')
  return result
}

// Update objective partial
export async function updateObjectivePartial(id: string, data: {
  title?: string
  description?: string
  perspectiveId?: string
  pillarId?: string
  statusId?: string
  sponsorUserId?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const existing = await prisma.strategicObjective.findFirst({
    where: { id, tenantId: session.user.tenantId },
  })
  if (!existing) throw new Error('Objective not found')

  const canManage = await canManageObjectives(session.user.id, session.user.tenantId, existing.orgNodeId)
  if (!canManage) {
    throw new Error('Insufficient permissions')
  }

  const result = await prisma.strategicObjective.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.perspectiveId && { perspectiveId: data.perspectiveId }),
      ...(data.pillarId !== undefined && { pillarId: data.pillarId }),
      ...(data.statusId && { statusId: data.statusId }),
      ...(data.sponsorUserId && { sponsorUserId: data.sponsorUserId }),
    },
  })

  revalidatePath('/app/strategy')
  return result
}

// Delete objective
export async function deleteObjective(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const existing = await prisma.strategicObjective.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      responsibilities: true,
      linksFrom: true,
      linksTo: true,
      children: true,
    },
  })
  if (!existing) throw new Error('Objective not found')

  const canManage = await canManageObjectives(session.user.id, session.user.tenantId, existing.orgNodeId)
  if (!canManage) {
    throw new Error('Insufficient permissions')
  }

  await prisma.strategicObjective.delete({
    where: { id },
  })

  revalidatePath('/app/strategy')
}

// Create objective in region
export async function createObjectiveInRegion(data: {
  mapRegion: string
  title: string
  description?: string
  perspectiveId?: string
  pillarId?: string
  statusId?: string
  sponsorUserId?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const activeOrgNodeId = await getActiveOrgNode(session.user.id, session.user.tenantId)
  if (!activeOrgNodeId) {
    throw new Error('No active org node')
  }

  if (!(await canManageObjectives(session.user.id, session.user.tenantId, activeOrgNodeId))) {
    throw new Error('Insufficient permissions')
  }

  // Get max orderIndex for the region
  const maxOrder = await prisma.strategicObjective.findFirst({
    where: {
      tenantId: session.user.tenantId,
      orgNodeId: activeOrgNodeId,
      mapRegion: data.mapRegion,
    },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  })

  const orderIndex = (maxOrder?.orderIndex ?? 0) + 1

  // Set defaults if not provided
  const perspectiveId = data.perspectiveId || (await prisma.perspective.findFirst({
    where: { tenantId: session.user.tenantId },
    select: { id: true },
  }))?.id

  const statusId = data.statusId || (await prisma.objectiveStatus.findFirst({
    where: { tenantId: session.user.tenantId },
    select: { id: true },
  }))?.id

  const sponsorUserId = data.sponsorUserId || session.user.id

  if (!perspectiveId || !statusId) {
    throw new Error('Missing required configuration: perspective or status')
  }

  const result = await prisma.strategicObjective.create({
    data: {
      tenantId: session.user.tenantId,
      orgNodeId: activeOrgNodeId,
      mapRegion: data.mapRegion,
      title: data.title,
      description: data.description,
      perspectiveId,
      pillarId: data.pillarId,
      statusId,
      sponsorUserId,
      orderIndex,
      weight: 100,
    },
  })

  revalidatePath('/app/strategy')
  return result
}

// Reorder objective
export async function reorderObjective(objectiveId: string, direction: 'up' | 'down') {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const objective = await prisma.strategicObjective.findFirst({
    where: { id: objectiveId, tenantId: session.user.tenantId },
  })
  if (!objective) throw new Error('Objective not found')

  const canManage = await canManageObjectives(session.user.id, session.user.tenantId, objective.orgNodeId)
  if (!canManage) {
    throw new Error('Insufficient permissions')
  }

  // Find adjacent objective
  const adjacentObjective = await prisma.strategicObjective.findFirst({
    where: {
      tenantId: session.user.tenantId,
      orgNodeId: objective.orgNodeId,
      mapRegion: objective.mapRegion,
      orderIndex: direction === 'up' ? objective.orderIndex - 1 : objective.orderIndex + 1,
    },
  })

  if (!adjacentObjective) return // Already at the edge

  // Swap order indices
  await prisma.$transaction([
    prisma.strategicObjective.update({
      where: { id: objectiveId },
      data: { orderIndex: adjacentObjective.orderIndex },
    }),
    prisma.strategicObjective.update({
      where: { id: adjacentObjective.id },
      data: { orderIndex: objective.orderIndex },
    }),
  ])

  revalidatePath('/app/strategy')
}