'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

interface CreateKeyResultInput {
  objectiveId: string
  title: string
  description?: string
  targetValue: number
  currentValue?: number
  metricTypeId?: string
  unit?: string
  statusId?: string
  startDate?: Date
  endDate?: Date
}

interface UpdateKeyResultInput {
  title?: string
  description?: string
  targetValue?: number
  currentValue?: number
  metricTypeId?: string
  unit?: string
  statusId?: string
  startDate?: Date
  endDate?: Date
  orderIndex?: number
}

export async function createKeyResult(input: CreateKeyResultInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const { objectiveId, ...data } = input

  // Verify objective belongs to tenant
  const objective = await prisma.strategicObjective.findFirst({
    where: {
      id: objectiveId,
      tenantId: session.user.tenantId,
    },
  })

  if (!objective) {
    throw new Error('Objective not found')
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
      title: data.title,
      description: data.description,
      targetValue: data.targetValue,
      currentValue: data.currentValue ?? 0,
      metricTypeId: data.metricTypeId,
      unit: data.unit ?? '%',
      statusId: data.statusId,
      startDate: data.startDate,
      endDate: data.endDate,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
    include: {
      metricType: true,
      status: true,
    },
  })

  revalidatePath('/app/strategy/objectives')
  revalidatePath('/app/strategy/map')

  return keyResult
}

export async function updateKeyResult(id: string, input: UpdateKeyResultInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  // Verify key result belongs to tenant
  const existing = await prisma.keyResult.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  if (!existing) {
    throw new Error('Key Result not found')
  }

  const keyResult = await prisma.keyResult.update({
    where: { id },
    data: input,
    include: {
      metricType: true,
      status: true,
    },
  })

  revalidatePath('/app/strategy/objectives')
  revalidatePath('/app/strategy/map')

  return keyResult
}

export async function deleteKeyResult(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  // Verify key result belongs to tenant
  const existing = await prisma.keyResult.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  if (!existing) {
    throw new Error('Key Result not found')
  }

  await prisma.keyResult.delete({
    where: { id },
  })

  revalidatePath('/app/strategy/objectives')
  revalidatePath('/app/strategy/map')
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
    },
    orderBy: { orderIndex: 'asc' },
  })

  return keyResults
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
      objective: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  })

  return keyResult
}

export async function calculateObjectiveProgress(objectiveId: string): Promise<number> {
  const keyResults = await prisma.keyResult.findMany({
    where: { objectiveId },
    select: {
      targetValue: true,
      currentValue: true,
    },
  })

  if (keyResults.length === 0) {
    return 0
  }

  // Calculate average progress across all KRs
  const totalProgress = keyResults.reduce((sum, kr) => {
    if (kr.targetValue === 0) return sum
    const progress = Math.min(100, Math.max(0, (kr.currentValue / kr.targetValue) * 100))
    return sum + progress
  }, 0)

  return Math.round(totalProgress / keyResults.length)
}
