'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

const objectiveStatusSchema = z.object({
  key: z.string().min(1, 'Chave é obrigatória').regex(/^[a-z0-9_-]+$/, 'Chave deve conter apenas letras minúsculas, números, hífen ou underscore'),
  name: z.string().min(1, 'Nome é obrigatório'),
  order: z.number().int().min(0),
  color: z.string().optional(),
})

export async function listObjectiveStatuses() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  return await prisma.objectiveStatus.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { order: 'asc' },
  })
}

export async function createObjectiveStatus(data: z.infer<typeof objectiveStatusSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const validatedData = objectiveStatusSchema.parse(data)

  // Check if key is unique for this tenant
  const existing = await prisma.objectiveStatus.findFirst({
    where: {
      tenantId: session.user.tenantId,
      key: validatedData.key,
    },
  })

  if (existing) {
    throw new Error('Chave já existe')
  }

  const result = await prisma.objectiveStatus.create({
    data: {
      tenantId: session.user.tenantId,
      ...validatedData,
    },
  })

  revalidatePath('/app/admin/config')
  return result
}

export async function updateObjectiveStatus(id: string, data: z.infer<typeof objectiveStatusSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const validatedData = objectiveStatusSchema.parse(data)

  // Check if key is unique for this tenant (excluding current record)
  const existing = await prisma.objectiveStatus.findFirst({
    where: {
      tenantId: session.user.tenantId,
      key: validatedData.key,
      id: { not: id },
    },
  })

  if (existing) {
    throw new Error('Chave já existe')
  }

  const result = await prisma.objectiveStatus.update({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    data: validatedData,
  })

  revalidatePath('/app/admin/config')
  return result
}

export async function deleteObjectiveStatus(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  await prisma.objectiveStatus.delete({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  revalidatePath('/app/admin/config')
}