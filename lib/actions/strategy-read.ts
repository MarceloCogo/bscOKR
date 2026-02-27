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

// Get strategy map data
export async function getStrategyMap() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      throw new Error('Unauthorized')
    }

    const activeOrgNodeId = await getActiveOrgNode(session.user.id, session.user.tenantId)

    // DEV-only logging for consistency checking
    if (process.env.NODE_ENV === 'development') {
      console.debug('[getStrategyMap] Context check:', {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        activeOrgNodeId
      })
    }

    if (!activeOrgNodeId) {
      return {
        needsContext: true,
        orgNode: null,
        isEditAllowed: false,
        meta: null,
        regions: {
          ambition: null,
          growthFocus: [],
          valueProposition: null,
          pillarOffer: [],
          pillarRevenue: [],
          pillarEfficiency: [],
          peopleBase: [],
        },
      }
    }

    const [objectives, meta, orgNode] = await Promise.all([
      prisma.strategicObjective.findMany({
        where: {
          tenantId: session.user.tenantId,
          orgNodeId: activeOrgNodeId,
        },
        include: {
          perspective: true,
          pillar: true,
          status: true,
          sponsor: { select: { id: true, name: true } },
          responsibilities: {
            include: {
              responsibilityRole: true,
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      }),
      prisma.strategyMapMeta.findFirst({
        where: {
          tenantId: session.user.tenantId,
          orgNodeId: activeOrgNodeId,
        },
      }),
      prisma.orgNode.findFirst({
        where: {
          id: activeOrgNodeId,
          tenantId: session.user.tenantId,
        },
        select: { id: true, name: true, type: { select: { name: true } } },
      }),
    ])

    // Garantir estrutura segura sempre
    const safeMeta = meta || {
      ambitionText: '',
      valuePropositionText: '',
    }

    // DEV-only logging for meta consistency
    if (process.env.NODE_ENV === 'development') {
      console.debug('[getStrategyMap] Meta lookup:', {
        tenantId: session.user.tenantId,
        activeOrgNodeId,
        metaFound: !!meta
      })
    }

    // Group objectives by region
    const regions = {
      ambition: objectives.find(obj => obj.mapRegion === 'AMBITION') || null,
      growthFocus: objectives.filter(obj => obj.mapRegion === 'GROWTH_FOCUS'),
      valueProposition: objectives.find(obj => obj.mapRegion === 'VALUE_PROPOSITION') || null,
      pillarOffer: objectives.filter(obj => obj.mapRegion === 'PILLAR_OFFER'),
      pillarRevenue: objectives.filter(obj => obj.mapRegion === 'PILLAR_REVENUE'),
      pillarEfficiency: objectives.filter(obj => obj.mapRegion === 'PILLAR_EFFICIENCY'),
      peopleBase: objectives.filter(obj => obj.mapRegion === 'PEOPLE_BASE'),
    }

    const isEditAllowed = await canManageObjectives(session.user.id, session.user.tenantId, activeOrgNodeId)

    return {
      needsContext: false,
      orgNode,
      isEditAllowed,
      meta: safeMeta,
      regions,
    }
  } catch (error) {
    // Log completo para debug
    console.error('[getStrategyMap] Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      action: 'getStrategyMap'
    })

    // Retornar payload seguro
    return {
      errorCode: 'LOAD_FAILED',
      needsContext: false,
      orgNode: null,
      isEditAllowed: false,
      meta: { ambitionText: '', valuePropositionText: '' },
      regions: {
        ambition: null,
        growthFocus: [],
        valueProposition: null,
        pillarOffer: [],
        pillarRevenue: [],
        pillarEfficiency: [],
        peopleBase: [],
      },
    }
  }
}