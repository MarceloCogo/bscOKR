import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateKRMetrics } from '@/lib/domain/kr-metrics'
import { createKRSchema, sanitizeKRPayloadByType } from '@/lib/domain/kr-validation'

async function canManageKR(userId: string, tenantId: string, orgNodeId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  })

  const permissions = userRoles.flatMap(ur => JSON.parse(ur.role.permissionsJson))
  const perms = permissions.reduce((acc, perm) => ({ ...acc, ...perm }), {}) as Record<string, boolean>
  if (perms.canManageConfig || perms.canEditAll) return true

  const isLeader = await prisma.orgNode.count({
    where: { id: orgNodeId, tenantId, leaderUserId: userId },
  })

  return isLeader > 0
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const objectiveId = searchParams.get('objectiveId')

    const where: any = {
      tenantId: session.user.tenantId,
    }

    if (objectiveId) {
      where.objectiveId = objectiveId
    }

    const keyResults = await prisma.keyResult.findMany({
      where,
      include: {
        metricType: true,
        status: true,
        cycle: {
          select: {
            id: true,
            name: true,
          },
        },
        objective: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { orderIndex: 'asc' },
    })

    const withComputed = keyResults.map((kr) => ({
      ...kr,
      computed: calculateKRMetrics({
        type: kr.type,
        targetValue: kr.targetValue,
        baselineValue: kr.baselineValue,
        thresholdValue: kr.thresholdValue,
        thresholdDirection: kr.thresholdDirection,
        currentValue: kr.currentValue,
        checklistJson: kr.checklistJson,
      }),
    }))

    return NextResponse.json({ keyResults: withComputed })
  } catch (error) {
    console.error('Error fetching key results:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { objectiveId } = body

    if (!objectiveId) {
      return NextResponse.json({ error: 'objectiveId is required' }, { status: 400 })
    }

    const parsed = createKRSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const payload: any = sanitizeKRPayloadByType(parsed.data as any)

    // Verify objective belongs to tenant
    const objective = await prisma.strategicObjective.findFirst({
      where: {
        id: objectiveId,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        orgNodeId: true,
      },
    })

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
    }

    const canManage = await canManageKR(session.user.id, session.user.tenantId, objective.orgNodeId)
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get max order index
    const maxOrder = await prisma.keyResult.aggregate({
      where: { objectiveId },
      _max: { orderIndex: true },
    })

    const keyResult = await prisma.keyResult.create({
      data: {
        tenantId: session.user.tenantId,
        objectiveId,
        title: payload.title,
        description: payload.description,
        type: payload.type,
        dueDate: payload.dueDate,
        targetValue: payload.targetValue ?? null,
        baselineValue: payload.baselineValue ?? null,
        thresholdValue: payload.thresholdValue ?? null,
        thresholdDirection: payload.thresholdDirection ?? null,
        currentValue: payload.currentValue ?? null,
        unit: payload.unit ?? null,
        checklistJson: payload.checklistJson ?? null,
        metricTypeId: body.metricTypeId ?? null,
        statusId: body.statusId ?? null,
        cycleId: body.cycleId ?? null,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
      include: {
        metricType: true,
        status: true,
        cycle: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      keyResult: {
        ...keyResult,
        computed: calculateKRMetrics({
          type: keyResult.type,
          targetValue: keyResult.targetValue,
          baselineValue: keyResult.baselineValue,
          thresholdValue: keyResult.thresholdValue,
          thresholdDirection: keyResult.thresholdDirection,
          currentValue: keyResult.currentValue,
          checklistJson: keyResult.checklistJson,
        }),
      },
    })
  } catch (error) {
    console.error('Error creating key result:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
