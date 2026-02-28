'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'
import { calculateKRMetrics } from '@/lib/domain/kr-metrics'
import { createKRSchema, sanitizeKRPayloadByType, updateKRSchema } from '@/lib/domain/kr-validation'

type CreateKeyResultInput = {
  objectiveId: string
  title: string
  description?: string | null
  type: 'AUMENTO' | 'REDUCAO' | 'ENTREGAVEL' | 'LIMIAR'
  dueDate: Date
  targetValue?: number | null
  baselineValue?: number | null
  thresholdValue?: number | null
  thresholdDirection?: 'MAXIMO' | 'MINIMO' | null
  currentValue?: number | null
  unit?: 'PERCENTUAL' | 'BRL' | 'USD' | 'EUR' | 'UNIDADE' | null
  checklistJson?: Array<{ id: string; title: string; done: boolean }> | null
  statusId?: string | null
  cycleId?: string | null
}

type UpdateKeyResultInput = Partial<CreateKeyResultInput> & {
  orderIndex?: number
}

async function getUserPermissions(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  })

  const permissions = userRoles.flatMap(ur => JSON.parse(ur.role.permissionsJson))
  return permissions.reduce((acc, perm) => ({ ...acc, ...perm }), {})
}

async function canManageKR(userId: string, tenantId: string, orgNodeId: string) {
  const perms = await getUserPermissions(userId)
  if (perms.canManageConfig || perms.canEditAll) return true

  const isLeader = await prisma.orgNode.count({
    where: { id: orgNodeId, tenantId, leaderUserId: userId },
  })

  return isLeader > 0
}

export async function createKeyResult(input: CreateKeyResultInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const objective = await prisma.strategicObjective.findFirst({
    where: {
      id: input.objectiveId,
      tenantId: session.user.tenantId,
    },
  })

  if (!objective) {
    throw new Error('Objective not found')
  }

  const canManage = await canManageKR(session.user.id, session.user.tenantId, objective.orgNodeId)
  if (!canManage) {
    throw new Error('Insufficient permissions')
  }

  const parsed = createKRSchema.parse(input)
  const payload = sanitizeKRPayloadByType(parsed)

  const maxOrder = await prisma.keyResult.aggregate({
    where: { objectiveId: input.objectiveId },
    _max: { orderIndex: true },
  })

  const keyResult = await prisma.keyResult.create({
    data: {
      tenantId: session.user.tenantId,
      objectiveId: input.objectiveId,
      title: payload.title,
      description: payload.description,
      type: payload.type,
      dueDate: payload.dueDate,
      targetValue: (payload as any).targetValue ?? null,
      baselineValue: (payload as any).baselineValue ?? null,
      thresholdValue: (payload as any).thresholdValue ?? null,
      thresholdDirection: (payload as any).thresholdDirection ?? null,
      currentValue: (payload as any).currentValue ?? null,
      unit: (payload as any).unit ?? null,
      checklistJson: (payload as any).checklistJson ?? null,
      statusId: payload.statusId ?? null,
      cycleId: payload.cycleId ?? null,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    } as any,
    include: {
      metricType: true,
      status: true,
      cycle: {
        select: { id: true, name: true },
      },
    },
  })

  revalidatePath('/app/strategy/objectives')
  revalidatePath('/app/strategy/map')
  revalidatePath('/app/krs')

  return {
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
  }
}

export async function updateKeyResult(id: string, input: UpdateKeyResultInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

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
    throw new Error('Key Result not found')
  }

  const canManage = await canManageKR(session.user.id, session.user.tenantId, existing.objective.orgNodeId)
  if (!canManage) {
    throw new Error('Insufficient permissions')
  }

  const parsed = updateKRSchema.parse(input)
  const payload = sanitizeKRPayloadByType(parsed)

  const keyResult = await prisma.keyResult.update({
    where: { id },
    data: payload as any,
    include: {
      metricType: true,
      status: true,
      cycle: {
        select: { id: true, name: true },
      },
    },
  })

  revalidatePath('/app/strategy/objectives')
  revalidatePath('/app/strategy/map')
  revalidatePath('/app/krs')

  return {
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
  }
}

export async function deleteKeyResult(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

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
    throw new Error('Key Result not found')
  }

  const canManage = await canManageKR(session.user.id, session.user.tenantId, existing.objective.orgNodeId)
  if (!canManage) {
    throw new Error('Insufficient permissions')
  }

  await prisma.keyResult.delete({
    where: { id },
  })

  revalidatePath('/app/strategy/objectives')
  revalidatePath('/app/strategy/map')
  revalidatePath('/app/krs')
}

export async function getKeyResultsByObjective(objectiveId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const keyResults = await prisma.keyResult.findMany({
    where: {
      objectiveId,
      tenantId: session.user.tenantId,
    },
    include: {
      metricType: true,
      status: true,
      cycle: {
        select: { id: true, name: true },
      },
    },
    orderBy: { orderIndex: 'asc' },
  })

  return keyResults.map((kr) => ({
    ...kr,
    computed: calculateKRMetrics({
      type: (kr as any).type,
      targetValue: (kr as any).targetValue,
      baselineValue: (kr as any).baselineValue,
      thresholdValue: (kr as any).thresholdValue,
      thresholdDirection: (kr as any).thresholdDirection,
      currentValue: (kr as any).currentValue,
      checklistJson: (kr as any).checklistJson,
    }),
  }))
}

export async function getKeyResultById(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const keyResult = await prisma.keyResult.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    include: {
      metricType: true,
      status: true,
      cycle: {
        select: { id: true, name: true },
      },
      objective: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  if (!keyResult) return null

  return {
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
  }
}

export async function calculateObjectiveProgress(objectiveId: string): Promise<number> {
  const keyResults = await prisma.keyResult.findMany({
    where: { objectiveId },
    select: {
      type: true,
      targetValue: true,
      baselineValue: true,
      thresholdValue: true,
      thresholdDirection: true,
      currentValue: true,
      checklistJson: true,
    } as any,
  })

  if (keyResults.length === 0) {
    return 0
  }

  const totalProgress = keyResults.reduce((sum, kr) => {
    const metrics = calculateKRMetrics({
      type: (kr as any).type,
      targetValue: (kr as any).targetValue,
      baselineValue: (kr as any).baselineValue,
      thresholdValue: (kr as any).thresholdValue,
      thresholdDirection: (kr as any).thresholdDirection,
      currentValue: (kr as any).currentValue,
      checklistJson: (kr as any).checklistJson,
    })
    return sum + metrics.progress
  }, 0)

  return Math.round(totalProgress / keyResults.length)
}
