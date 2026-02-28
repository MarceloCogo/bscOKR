import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { KRUpdateEventType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { calculateKRMetrics } from '@/lib/domain/kr-metrics'
import { canManageKR } from '@/lib/domain/kr-permissions'

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

    if (existing.type === 'ENTREGAVEL') {
      return NextResponse.json(
        { error: 'KRs do tipo ENTREGAVEL devem ser atualizados via checklist' },
        { status: 400 }
      )
    }

    const previousValue = existing.currentValue ?? 0

    const previousMetrics = calculateKRMetrics({
      type: existing.type,
      targetValue: existing.targetValue,
      baselineValue: existing.baselineValue,
      thresholdValue: existing.thresholdValue,
      thresholdDirection: existing.thresholdDirection,
      currentValue: existing.currentValue,
      checklistJson: existing.checklistJson,
    })

    const nextMetrics = calculateKRMetrics({
      type: existing.type,
      targetValue: existing.targetValue,
      baselineValue: existing.baselineValue,
      thresholdValue: existing.thresholdValue,
      thresholdDirection: existing.thresholdDirection,
      currentValue,
      checklistJson: existing.checklistJson,
    })

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

      const monthlyHistory = await tx.kRUpdateHistory.upsert({
        where: {
          tenantId_keyResultId_referenceMonth_eventType: {
            tenantId: session.user.tenantId,
            keyResultId: id,
            referenceMonth: monthRef,
            eventType: KRUpdateEventType.NUMERIC_UPDATE,
          },
        },
        update: {
          newValue: currentValue,
          newProgress: nextMetrics.progress,
          updatedByUserId: session.user.id,
          ...(typeof notes === 'string' ? { notes } : {}),
        },
        create: {
          tenantId: session.user.tenantId,
          keyResultId: id,
          updatedByUserId: session.user.id,
          eventType: KRUpdateEventType.NUMERIC_UPDATE,
          referenceMonth: monthRef,
          previousValue,
          newValue: currentValue,
          previousProgress: previousMetrics.progress,
          newProgress: nextMetrics.progress,
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
