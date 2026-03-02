import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'
import { getUserOrgScope } from '@/lib/domain/org-scope'

async function canEditNode(userId: string, tenantId: string, orgNodeId: string) {
  const [permissions, scope, isLeaderCount] = await Promise.all([
    getUserPermissions(userId, tenantId),
    getUserOrgScope(userId, tenantId),
    prisma.orgNode.count({ where: { id: orgNodeId, tenantId, leaderUserId: userId } }),
  ])

  return (
    permissions.canManageConfig ||
    permissions.canEditAll ||
    scope.editableNodeIds.includes(orgNodeId) ||
    isLeaderCount > 0
  )
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
    if (!permissions.canViewStrategyMap) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const orgNodeId = request.nextUrl.searchParams.get('orgNodeId')
    if (!orgNodeId) {
      return NextResponse.json({ error: 'orgNodeId is required' }, { status: 400 })
    }

    const scope = await getUserOrgScope(session.user.id, session.user.tenantId)
    if (!scope.viewableNodeIds.includes(orgNodeId)) {
      return NextResponse.json({ error: 'Insufficient scope for this org node' }, { status: 403 })
    }

    const [objectives, meta, orgNode, isEditAllowed] = await Promise.all([
      prisma.strategicObjective.findMany({
        where: {
          tenantId: session.user.tenantId,
          orgNodeId,
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
          orgNodeId,
        },
      }),
      prisma.orgNode.findFirst({
        where: {
          id: orgNodeId,
          tenantId: session.user.tenantId,
        },
        select: { id: true, name: true, type: { select: { name: true } } },
      }),
      canEditNode(session.user.id, session.user.tenantId, orgNodeId),
    ])

    const regions = {
      ambition: objectives.find((obj) => obj.mapRegion === 'AMBITION') || null,
      growthFocus: objectives.filter((obj) => obj.mapRegion === 'GROWTH_FOCUS'),
      valueProposition: objectives.find((obj) => obj.mapRegion === 'VALUE_PROPOSITION') || null,
      pillarOffer: objectives.filter((obj) => obj.mapRegion === 'PILLAR_OFFER'),
      pillarRevenue: objectives.filter((obj) => obj.mapRegion === 'PILLAR_REVENUE'),
      pillarEfficiency: objectives.filter((obj) => obj.mapRegion === 'PILLAR_EFFICIENCY'),
      peopleBase: objectives.filter((obj) => obj.mapRegion === 'PEOPLE_BASE'),
    }

    return NextResponse.json({
      orgNode,
      isEditAllowed,
      meta: meta || { ambitionText: '', valuePropositionText: '' },
      regions,
    })
  } catch (error) {
    console.error('Error fetching strategy map by org node:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
