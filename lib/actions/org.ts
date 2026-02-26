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

// Helper to check if user can manage org nodes
async function canManageOrgNodes(userId: string, tenantId: string) {
  const perms = await getUserPermissions(userId, tenantId)
  return perms.canManageUsers || perms.canManageConfig // assuming admin has these
}

// Helper to check if user is leader of a specific node
async function isLeaderOfNode(userId: string, orgNodeId: string) {
  const node = await prisma.orgNode.findFirst({
    where: { id: orgNodeId, leaderUserId: userId },
  })
  return !!node
}

const orgNodeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  typeId: z.string().min(1, 'Tipo é obrigatório'),
  parentId: z.string().optional(),
  leaderUserId: z.string().optional(),
})

const membershipSchema = z.object({
  orgNodeId: z.string(),
  userId: z.string(),
  isPrimary: z.boolean().optional().default(false),
})

// OrgNodes
export async function listOrgNodes() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  return await prisma.orgNode.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      type: true,
      leader: { select: { id: true, name: true } },
      memberships: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { children: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getOrgTree() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const nodes = await prisma.orgNode.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      type: true,
      leader: { select: { id: true, name: true } },
      memberships: { include: { user: { select: { id: true, name: true } } } },
      children: true,
    },
    orderBy: { name: 'asc' },
  })

  // Build tree structure
  const nodeMap = new Map()
  const roots: any[] = []

  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] })
  })

  nodes.forEach(node => {
    if (node.parentId) {
      const parent = nodeMap.get(node.parentId)
      if (parent) {
        parent.children.push(nodeMap.get(node.id))
      }
    } else {
      roots.push(nodeMap.get(node.id))
    }
  })

  return roots
}

export async function createOrgNode(data: z.infer<typeof orgNodeSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  if (!(await canManageOrgNodes(session.user.id, session.user.tenantId))) {
    throw new Error('Insufficient permissions')
  }

  const validatedData = orgNodeSchema.parse(data)

  const result = await prisma.orgNode.create({
    data: {
      tenantId: session.user.tenantId,
      ...validatedData,
    },
  })

  revalidatePath('/app/organization')
  return result
}

export async function updateOrgNode(id: string, data: z.infer<typeof orgNodeSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const canManage = await canManageOrgNodes(session.user.id, session.user.tenantId)
  const isLeader = await isLeaderOfNode(session.user.id, id)

  if (!canManage && !isLeader) {
    throw new Error('Insufficient permissions')
  }

  const validatedData = orgNodeSchema.parse(data)

  const result = await prisma.orgNode.update({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    data: validatedData,
  })

  revalidatePath('/app/organization')
  return result
}

export async function deleteOrgNode(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  if (!(await canManageOrgNodes(session.user.id, session.user.tenantId))) {
    throw new Error('Insufficient permissions')
  }

  // Check for children
  const childrenCount = await prisma.orgNode.count({
    where: { parentId: id, tenantId: session.user.tenantId },
  })

  if (childrenCount > 0) {
    throw new Error('Não é possível excluir um nó que possui filhos')
  }

  // Check for memberships
  const membershipCount = await prisma.orgNodeMembership.count({
    where: { orgNodeId: id },
  })

  if (membershipCount > 0) {
    throw new Error('Não é possível excluir um nó que possui membros')
  }

  await prisma.orgNode.delete({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  revalidatePath('/app/organization')
}

// Memberships
export async function listOrgNodeMembers(orgNodeId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  return await prisma.orgNodeMembership.findMany({
    where: {
      orgNodeId,
      tenantId: session.user.tenantId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function addOrgNodeMember(data: z.infer<typeof membershipSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const canManage = await canManageOrgNodes(session.user.id, session.user.tenantId)
  const isLeader = await isLeaderOfNode(session.user.id, data.orgNodeId)

  if (!canManage && !isLeader) {
    throw new Error('Insufficient permissions')
  }

  const validatedData = membershipSchema.parse(data)

  // If setting as primary, unset other primaries for this user
  if (validatedData.isPrimary) {
    await prisma.orgNodeMembership.updateMany({
      where: {
        userId: validatedData.userId,
        tenantId: session.user.tenantId,
      },
      data: { isPrimary: false },
    })
  }

  const result = await prisma.orgNodeMembership.create({
    data: {
      tenantId: session.user.tenantId,
      ...validatedData,
    },
  })

  revalidatePath('/app/organization')
  return result
}

export async function removeOrgNodeMember(orgNodeId: string, userId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const canManage = await canManageOrgNodes(session.user.id, session.user.tenantId)
  const isLeader = await isLeaderOfNode(session.user.id, orgNodeId)

  if (!canManage && !isLeader) {
    throw new Error('Insufficient permissions')
  }

  await prisma.orgNodeMembership.delete({
    where: {
      orgNodeId_userId: {
        orgNodeId,
        userId,
      },
    },
  })

  revalidatePath('/app/organization')
}

export async function setPrimaryOrgNode(userId: string, orgNodeId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  // User can set their own primary, or admin can set anyone's
  if (session.user.id !== userId && !(await canManageOrgNodes(session.user.id, session.user.tenantId))) {
    throw new Error('Insufficient permissions')
  }

  // Check if user is member of the node
  const membership = await prisma.orgNodeMembership.findFirst({
    where: {
      orgNodeId,
      userId,
      tenantId: session.user.tenantId,
    },
  })

  if (!membership) {
    throw new Error('User is not a member of this org node')
  }

  // Unset other primaries
  await prisma.orgNodeMembership.updateMany({
    where: {
      userId,
      tenantId: session.user.tenantId,
    },
    data: { isPrimary: false },
  })

  // Set this as primary
  await prisma.orgNodeMembership.update({
    where: {
      orgNodeId_userId: {
        orgNodeId,
        userId,
      },
    },
    data: { isPrimary: true },
  })

  revalidatePath('/app/organization')
}

// User context
export async function getUserOrgContext() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const [memberships, preference, primaryMemberships] = await Promise.all([
    prisma.orgNodeMembership.findMany({
      where: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
      include: {
        orgNode: { include: { type: true } },
      },
    }),
    prisma.userPreference.findUnique({
      where: {
        tenantId_userId: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
      },
    }),
    prisma.orgNodeMembership.findMany({
      where: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        isPrimary: true,
      },
      include: {
        orgNode: { include: { type: true, memberships: { include: { user: { select: { id: true, name: true } } } }, children: true } },
      },
    }),
  ])

  return {
    activeOrgNodeId: preference?.activeOrgNodeId,
    memberships,
    primaryOrgNode: primaryMemberships[0]?.orgNode || null,
  }
}

export async function setActiveOrgNode(orgNodeId: string | null) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  // If setting to a specific node, ensure user is member
  if (orgNodeId) {
    const membership = await prisma.orgNodeMembership.findFirst({
      where: {
        orgNodeId,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
    })

    if (!membership) {
      throw new Error('User is not a member of this org node')
    }
  }

  await prisma.userPreference.upsert({
    where: {
      tenantId_userId: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
      },
    },
    update: {
      activeOrgNodeId: orgNodeId,
    },
    create: {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      activeOrgNodeId: orgNodeId,
    },
  })

  revalidatePath('/app/organization')
}

// User picker
export async function searchUsers(query: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  return await prisma.user.findMany({
    where: {
      tenantId: session.user.tenantId,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    take: 10,
  })
}