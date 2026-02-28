import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateKRMetrics } from '@/lib/domain/kr-metrics'
import { sanitizeKRPayloadByType, updateKRSchema } from '@/lib/domain/kr-validation'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const keyResult = await prisma.keyResult.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
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
        objective: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    if (!keyResult) {
      return NextResponse.json({ error: 'Key Result not found' }, { status: 404 })
    }

    return NextResponse.json({
      keyResult: {
        ...keyResult,
        computed: calculateKRMetrics({
          type: (keyResult as any).type,
          targetValue: (keyResult as any).targetValue,
          baselineValue: (keyResult as any).baselineValue,
          thresholdValue: (keyResult as any).thresholdValue,
          thresholdDirection: (keyResult as any).thresholdDirection,
          currentValue: (keyResult as any).currentValue,
          checklistJson: (keyResult as any).checklistJson,
        }),
      },
    })
  } catch (error) {
    console.error('Error fetching key result:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsed = updateKRSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const payload = sanitizeKRPayloadByType(parsed.data as any)

    // Verify key result belongs to tenant
    const existing = await prisma.keyResult.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        objective: {
          select: { orgNodeId: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Key Result not found' }, { status: 404 })
    }

    const canManage = await canManageKR(session.user.id, session.user.tenantId, existing.objective.orgNodeId)
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const keyResult = await prisma.keyResult.update({
      where: { id },
      data: {
        ...(payload.title !== undefined && { title: payload.title }),
        ...(payload.description !== undefined && { description: payload.description }),
        ...(payload.type !== undefined && { type: payload.type }),
        ...(payload.dueDate !== undefined && { dueDate: payload.dueDate }),
        ...(payload.targetValue !== undefined && { targetValue: payload.targetValue }),
        ...(payload.baselineValue !== undefined && { baselineValue: payload.baselineValue }),
        ...(payload.thresholdValue !== undefined && { thresholdValue: payload.thresholdValue }),
        ...(payload.thresholdDirection !== undefined && { thresholdDirection: payload.thresholdDirection }),
        ...(payload.currentValue !== undefined && { currentValue: payload.currentValue }),
        ...(payload.unit !== undefined && { unit: payload.unit }),
        ...(payload.checklistJson !== undefined && { checklistJson: payload.checklistJson }),
        ...(payload.statusId !== undefined && { statusId: payload.statusId }),
        ...(payload.cycleId !== undefined && { cycleId: payload.cycleId }),
        ...(payload.orderIndex !== undefined && { orderIndex: payload.orderIndex }),
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
          type: (keyResult as any).type,
          targetValue: (keyResult as any).targetValue,
          baselineValue: (keyResult as any).baselineValue,
          thresholdValue: (keyResult as any).thresholdValue,
          thresholdDirection: (keyResult as any).thresholdDirection,
          currentValue: (keyResult as any).currentValue,
          checklistJson: (keyResult as any).checklistJson,
        }),
      },
    })
  } catch (error) {
    console.error('Error updating key result:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify key result belongs to tenant
    const existing = await prisma.keyResult.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        objective: {
          select: { orgNodeId: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Key Result not found' }, { status: 404 })
    }

    const canManage = await canManageKR(session.user.id, session.user.tenantId, existing.objective.orgNodeId)
    if (!canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    await prisma.keyResult.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting key result:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
