import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateKRMetrics } from '@/lib/domain/kr-metrics'
import { canManageKR } from '@/lib/domain/kr-permissions'
import { sanitizeKRPayloadByType, updateKRSchema } from '@/lib/domain/kr-validation'
import { KRType, KRUpdateEventType } from '@prisma/client'

interface ChecklistItem {
  id: string
  title: string
  done: boolean
}

function parseChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return []

  return value.filter((item): item is ChecklistItem => {
    if (!item || typeof item !== 'object') return false
    const obj = item as Record<string, unknown>
    return (
      typeof obj.id === 'string' &&
      typeof obj.title === 'string' &&
      typeof obj.done === 'boolean'
    )
  })
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
    const monthRef = typeof body.referenceMonth === 'string' && /^\d{4}-\d{2}$/.test(body.referenceMonth)
      ? body.referenceMonth
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

    const previousChecklist = parseChecklist((existing as any).checklistJson)
    const nextChecklist = payload.checklistJson !== undefined
      ? parseChecklist(payload.checklistJson)
      : previousChecklist

    const previousMetrics = calculateKRMetrics({
      type: (existing as any).type,
      targetValue: (existing as any).targetValue,
      baselineValue: (existing as any).baselineValue,
      thresholdValue: (existing as any).thresholdValue,
      thresholdDirection: (existing as any).thresholdDirection,
      currentValue: (existing as any).currentValue,
      checklistJson: previousChecklist,
    })

    const nextType = (payload.type ?? (existing as any).type) as KRType
    const nextMetrics = calculateKRMetrics({
      type: nextType,
      targetValue: payload.targetValue !== undefined ? payload.targetValue : (existing as any).targetValue,
      baselineValue: payload.baselineValue !== undefined ? payload.baselineValue : (existing as any).baselineValue,
      thresholdValue: payload.thresholdValue !== undefined ? payload.thresholdValue : (existing as any).thresholdValue,
      thresholdDirection: payload.thresholdDirection !== undefined ? payload.thresholdDirection : (existing as any).thresholdDirection,
      currentValue: payload.currentValue !== undefined ? payload.currentValue : (existing as any).currentValue,
      checklistJson: nextChecklist,
    })

    const previousDoneCount = previousChecklist.filter((item) => item.done).length
    const newDoneCount = nextChecklist.filter((item) => item.done).length
    const previousItemsCount = previousChecklist.length
    const newItemsCount = nextChecklist.length

    const shouldCreateChecklistHistory =
      ((existing as any).type === KRType.ENTREGAVEL || nextType === KRType.ENTREGAVEL) &&
      payload.checklistJson !== undefined &&
      (
        previousMetrics.progress !== nextMetrics.progress ||
        previousItemsCount !== newItemsCount ||
        previousDoneCount !== newDoneCount
      )

    const previousNumericValue = (existing as any).currentValue
    const nextNumericValue = payload.currentValue
    const shouldCreateNumericHistory =
      ((existing as any).type === KRType.AUMENTO || (existing as any).type === KRType.REDUCAO || (existing as any).type === KRType.LIMIAR) &&
      typeof nextNumericValue === 'number' &&
      nextNumericValue !== previousNumericValue

    await prisma.$transaction(async (tx) => {
      await tx.keyResult.update({
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
      })

      if (shouldCreateChecklistHistory) {
        const existingMonthlyChecklist = await tx.kRUpdateHistory.findFirst({
          where: {
            tenantId: session.user.tenantId,
            keyResultId: id,
            referenceMonth: monthRef,
            eventType: KRUpdateEventType.CHECKLIST_UPDATE,
          },
          orderBy: { createdAt: 'desc' },
        })

        if (existingMonthlyChecklist) {
          await tx.kRUpdateHistory.update({
            where: { id: existingMonthlyChecklist.id },
            data: {
              newValue: nextMetrics.progress,
              newProgress: nextMetrics.progress,
              newItemsCount,
              newDoneCount,
              updatedByUserId: session.user.id,
            },
          })
        } else {
          await tx.kRUpdateHistory.create({
            data: {
              tenantId: session.user.tenantId,
              keyResultId: id,
              updatedByUserId: session.user.id,
              eventType: KRUpdateEventType.CHECKLIST_UPDATE,
              referenceMonth: monthRef,
              previousValue: previousMetrics.progress,
              newValue: nextMetrics.progress,
              previousProgress: previousMetrics.progress,
              newProgress: nextMetrics.progress,
              previousItemsCount,
              newItemsCount,
              previousDoneCount,
              newDoneCount,
            },
          })
        }
      }

      if (shouldCreateNumericHistory) {
        const existingMonthlyNumeric = await tx.kRUpdateHistory.findFirst({
          where: {
            tenantId: session.user.tenantId,
            keyResultId: id,
            referenceMonth: monthRef,
            eventType: KRUpdateEventType.NUMERIC_UPDATE,
          },
          orderBy: { createdAt: 'desc' },
        })

        if (existingMonthlyNumeric) {
          await tx.kRUpdateHistory.update({
            where: { id: existingMonthlyNumeric.id },
            data: {
              newValue: nextNumericValue ?? 0,
              newProgress: nextMetrics.progress,
              updatedByUserId: session.user.id,
            },
          })
        } else {
          await tx.kRUpdateHistory.create({
            data: {
              tenantId: session.user.tenantId,
              keyResultId: id,
              updatedByUserId: session.user.id,
              eventType: KRUpdateEventType.NUMERIC_UPDATE,
              referenceMonth: monthRef,
              previousValue: previousNumericValue ?? 0,
              newValue: nextNumericValue ?? 0,
              previousProgress: previousMetrics.progress,
              newProgress: nextMetrics.progress,
            },
          })
        }
      }
    })

    const keyResult = await prisma.keyResult.findFirst({
      where: { id, tenantId: session.user.tenantId },
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
        cycle: {
          select: {
            id: true,
            name: true,
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
