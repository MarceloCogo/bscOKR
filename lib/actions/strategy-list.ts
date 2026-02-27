'use server'

import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

// Helper to get active org node
async function getActiveOrgNode(userId: string, tenantId: string) {
  const pref = await prisma.userPreference.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  })

  return pref?.activeOrgNodeId
}

// List objectives
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

  // If no active context and no specific orgNodeId filter, return empty array
  if (!orgNodeFilter) {
    return []
  }

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