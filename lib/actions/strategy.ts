'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
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

const objectiveSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  perspectiveId: z.string().min(1, 'Perspectiva é obrigatória'),
  pillarId: z.string().optional(),
  statusId: z.string().min(1, 'Status é obrigatório'),
  weight: z.number().int().min(1).max(100).default(100),
  sponsorUserId: z.string().min(1, 'Sponsor é obrigatório'),
  orgNodeId: z.string().min(1, 'Org Node é obrigatório'),
  parentObjectiveId: z.string().optional(),
})

const responsibilitySchema = z.object({
  entityType: z.enum(['user', 'orgnode']),
  entityId: z.string(),
  responsibilityRoleId: z.string(),
  contributionWeight: z.number().int().min(0).max(100),
})

const linkSchema = z.object({
  fromObjectiveId: z.string(),
  toObjectiveId: z.string(),
  linkTypeId: z.string(),
})

// Objectives
export async function listObjectives(filters?: {
  orgNodeId?: string
  perspectiveId?: string
  pillarId?: string
  statusId?: string
  sponsorUserId?: string
  query?: string
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const activeOrgNodeId = await getActiveOrgNode(session.user.id, session.user.tenantId)
  const orgNodeFilter = filters?.orgNodeId || activeOrgNodeId

  const where: any = {
    tenantId: session.user.tenantId,
  }

  if (orgNodeFilter) where.orgNodeId = orgNodeFilter
  if (filters?.perspectiveId) where.perspectiveId = filters.perspectiveId
  if (filters?.pillarId) where.pillarId = filters.pillarId
  if (filters?.statusId) where.statusId = filters.statusId
  if (filters?.sponsorUserId) where.sponsorUserId = filters.sponsorUserId
  if (filters?.query) {
    where.title = { contains: filters.query, mode: 'insensitive' }
  }

  return await prisma.strategicObjective.findMany({
    where,
    include: {
      perspective: true,
      pillar: true,
      status: true,
      sponsor: { select: { id: true, name: true } },
      orgNode: { include: { type: true } },
      responsibilities: {
        include: {
          responsibilityRole: true,
        },
      },
      _count: { select: { children: true, linksFrom: true, linksTo: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getObjective(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  return await prisma.strategicObjective.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    include: {
      perspective: true,
      pillar: true,
      status: true,
      sponsor: { select: { id: true, name: true, email: true } },
      orgNode: { include: { type: true } },
      parent: { select: { id: true, title: true } },
      children: { select: { id: true, title: true } },
      responsibilities: {
        include: {
          responsibilityRole: true,
        },
      },
      linksFrom: {
        include: {
          toObjective: { select: { id: true, title: true } },
          linkType: true,
        },
      },
      linksTo: {
        include: {
          fromObjective: { select: { id: true, title: true } },
          linkType: true,
        },
      },
    },
  })
}

export async function createObjective(data: z.infer<typeof objectiveSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const canManage = await canManageObjectives(session.user.id, session.user.tenantId, data.orgNodeId)
  if (!canManage) {
    throw new Error('Insufficient permissions')
  }

  const validatedData = objectiveSchema.parse(data)

  const result = await prisma.strategicObjective.create({
    data: {
      tenantId: session.user.tenantId,
      ...validatedData,
    },
  })

  revalidatePath('/app/strategy')
  return result
}

export async function updateObjective(id: string, data: z.infer<typeof objectiveSchema>) {
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

  const validatedData = objectiveSchema.parse(data)

  const result = await prisma.strategicObjective.update({
    where: { id },
    data: validatedData,
  })

  revalidatePath('/app/strategy')
  return result
}

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

  if (existing.responsibilities.length > 0 || existing.linksFrom.length > 0 || existing.linksTo.length > 0 || existing.children.length > 0) {
    throw new Error('Cannot delete objective with dependencies. Remove responsibilities, links, and children first.')
  }

  await prisma.strategicObjective.delete({ where: { id } })

  revalidatePath('/app/strategy')
}

// Responsibilities
export async function listObjectiveResponsibilities(objectiveId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  return await prisma.objectiveResponsibility.findMany({
    where: {
      objectiveId,
      tenantId: session.user.tenantId,
    },
    include: {
      responsibilityRole: true,
    },
    orderBy: { responsibilityRole: { order: 'asc' } },
  })
}

export async function addObjectiveResponsibility(objectiveId: string, data: z.infer<typeof responsibilitySchema>) {
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

  const validatedData = responsibilitySchema.parse(data)

  const result = await prisma.objectiveResponsibility.create({
    data: {
      tenantId: session.user.tenantId,
      objectiveId,
      ...validatedData,
    },
  })

  revalidatePath('/app/strategy')
  return result
}

export async function updateObjectiveResponsibility(id: string, data: z.infer<typeof responsibilitySchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const existing = await prisma.objectiveResponsibility.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: { objective: true },
  })
  if (!existing) throw new Error('Responsibility not found')

  const canManage = await canManageObjectives(session.user.id, session.user.tenantId, existing.objective.orgNodeId)
  if (!canManage) {
    throw new Error('Insufficient permissions')
  }

  const validatedData = responsibilitySchema.parse(data)

  const result = await prisma.objectiveResponsibility.update({
    where: { id },
    data: validatedData,
  })

  revalidatePath('/app/strategy')
  return result
}

export async function removeObjectiveResponsibility(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const existing = await prisma.objectiveResponsibility.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: { objective: true },
  })
  if (!existing) throw new Error('Responsibility not found')

  const canManage = await canManageObjectives(session.user.id, session.user.tenantId, existing.objective.orgNodeId)
  if (!canManage) {
    throw new Error('Insufficient permissions')
  }

  await prisma.objectiveResponsibility.delete({ where: { id } })

  revalidatePath('/app/strategy')
}

// Links
export async function listObjectiveLinks(objectiveId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const [linksFrom, linksTo] = await Promise.all([
    prisma.objectiveLink.findMany({
      where: {
        fromObjectiveId: objectiveId,
        tenantId: session.user.tenantId,
      },
      include: {
        toObjective: { select: { id: true, title: true } },
        linkType: true,
      },
    }),
    prisma.objectiveLink.findMany({
      where: {
        toObjectiveId: objectiveId,
        tenantId: session.user.tenantId,
      },
      include: {
        fromObjective: { select: { id: true, title: true } },
        linkType: true,
      },
    }),
  ])

  return { linksFrom, linksTo }
}

export async function addObjectiveLink(data: z.infer<typeof linkSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const objectives = await prisma.strategicObjective.findMany({
    where: {
      id: { in: [data.fromObjectiveId, data.toObjectiveId] },
      tenantId: session.user.tenantId,
    },
  })
  if (objectives.length !== 2) throw new Error('Objectives not found')

  const canManage = objectives.every(obj => canManageObjectives(session.user.id, session.user.tenantId, obj.orgNodeId))
  if (!canManage) {
    throw new Error('Insufficient permissions')
  }

  const validatedData = linkSchema.parse(data)

  const result = await prisma.objectiveLink.create({
    data: {
      tenantId: session.user.tenantId,
      ...validatedData,
    },
  })

  revalidatePath('/app/strategy')
  return result
}

export async function removeObjectiveLink(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const existing = await prisma.objectiveLink.findFirst({
    where: { id, tenantId: session.user.tenantId },
    include: {
      fromObjective: true,
      toObjective: true,
    },
  })
  if (!existing) throw new Error('Link not found')

  const canManage = await canManageObjectives(session.user.id, session.user.tenantId, existing.fromObjective.orgNodeId) &&
                    await canManageObjectives(session.user.id, session.user.tenantId, existing.toObjective.orgNodeId)
  if (!canManage) {
    throw new Error('Insufficient permissions')
  }

  await prisma.objectiveLink.delete({ where: { id } })

  revalidatePath('/app/strategy')
}

// Search functions
export async function searchObjectives(query: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  return await prisma.strategicObjective.findMany({
    where: {
      tenantId: session.user.tenantId,
      title: { contains: query, mode: 'insensitive' },
    },
    select: {
      id: true,
      title: true,
    },
    take: 10,
  })
}