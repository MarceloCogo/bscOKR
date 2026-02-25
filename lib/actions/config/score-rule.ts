'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

const scoreRuleSchema = z.object({
  scope: z.string().min(1, 'Escopo é obrigatório'),
  formulaKey: z.string().min(1, 'Chave da fórmula é obrigatória'),
  paramsJson: z.string().min(1, 'Parâmetros são obrigatórios'),
}).refine((data) => {
  try {
    JSON.parse(data.paramsJson)
    return true
  } catch {
    return false
  }
}, {
  message: 'Parâmetros devem ser um JSON válido',
  path: ['paramsJson'],
})

export async function listScoreRules() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  return await prisma.scoreRule.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { scope: 'asc' },
  })
}

export async function createScoreRule(data: z.infer<typeof scoreRuleSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const validatedData = scoreRuleSchema.parse(data)

  const existing = await prisma.scoreRule.findFirst({
    where: {
      tenantId: session.user.tenantId,
      scope: validatedData.scope,
    },
  })

  if (existing) {
    throw new Error('Já existe uma regra para este escopo')
  }

  const result = await prisma.scoreRule.create({
    data: {
      tenantId: session.user.tenantId,
      ...validatedData,
    },
  })

  revalidatePath('/app/admin/config')
  return result
}

export async function updateScoreRule(id: string, data: z.infer<typeof scoreRuleSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const validatedData = scoreRuleSchema.parse(data)

  const existing = await prisma.scoreRule.findFirst({
    where: {
      tenantId: session.user.tenantId,
      scope: validatedData.scope,
      id: { not: id },
    },
  })

  if (existing) {
    throw new Error('Já existe uma regra para este escopo')
  }

  const result = await prisma.scoreRule.update({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    data: validatedData,
  })

  revalidatePath('/app/admin/config')
  return result
}

export async function deleteScoreRule(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  await prisma.scoreRule.delete({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  revalidatePath('/app/admin/config')
}