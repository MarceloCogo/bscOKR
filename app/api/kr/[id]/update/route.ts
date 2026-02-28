import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { KRUpdateEventType } from '@prisma/client'
import { prisma } from '@/lib/db'

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
    const { currentValue, referenceMonth, notes } = body

    if (typeof currentValue !== 'number' || currentValue < 0) {
      return NextResponse.json(
        { error: 'currentValue must be a positive number' },
        { status: 400 }
      )
    }

    const monthRef = typeof referenceMonth === 'string' && /^\d{4}-\d{2}$/.test(referenceMonth)
      ? referenceMonth
      : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

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

    if ((existing as any).type === 'ENTREGAVEL') {
      return NextResponse.json(
        { error: 'KRs do tipo ENTREGAVEL devem ser atualizados via checklist' },
        { status: 400 }
      )
    }

    const previousValue = (existing as any).currentValue ?? 0

    const { keyResult, history } = await prisma.$transaction(async (tx) => {
      const updatedKR = await tx.keyResult.update({
        where: { id },
        data: { currentValue },
        include: {
          metricType: true,
          status: true,
          updateHistories: {
            select: {
              id: true,
              eventType: true,
              referenceMonth: true,
              previousValue: true,
              newValue: true,
              previousProgress: true,
              newProgress: true,
              previousItemsCount: true,
              newItemsCount: true,
              previousDoneCount: true,
              newDoneCount: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
          objective: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      })

      const existingMonthlyHistory = await tx.kRUpdateHistory.findFirst({
        where: {
          tenantId: session.user.tenantId,
          keyResultId: id,
          referenceMonth: monthRef,
          eventType: KRUpdateEventType.NUMERIC_UPDATE,
        },
        orderBy: { createdAt: 'desc' },
      })

      const monthlyHistory = existingMonthlyHistory
        ? await tx.kRUpdateHistory.update({
            where: { id: existingMonthlyHistory.id },
            data: {
              newValue: currentValue,
              newProgress: currentValue,
              updatedByUserId: session.user.id,
              notes: typeof notes === 'string' ? notes : existingMonthlyHistory.notes,
            },
          })
        : await tx.kRUpdateHistory.create({
            data: {
              tenantId: session.user.tenantId,
              keyResultId: id,
              updatedByUserId: session.user.id,
              eventType: KRUpdateEventType.NUMERIC_UPDATE,
              referenceMonth: monthRef,
              previousValue,
              newValue: currentValue,
              previousProgress: previousValue,
              newProgress: currentValue,
              notes: typeof notes === 'string' ? notes : null,
            },
          })

      return { keyResult: updatedKR, history: monthlyHistory }
    })

    return NextResponse.json({ keyResult, history })
  } catch (error) {
    console.error('Error updating key result value:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
