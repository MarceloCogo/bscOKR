'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

const perspectiveSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  order: z.number().int().min(0),
})

function normalizeString(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isAmbitionPerspectiveName(name: string) {
  return normalizeString(name) === 'ambicao estrategica'
}

export async function listPerspectives() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  return await prisma.perspective.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { order: 'asc' },
  })
}

export async function createPerspective(data: z.infer<typeof perspectiveSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const validatedData = perspectiveSchema.parse(data)

  if (isAmbitionPerspectiveName(validatedData.name)) {
    throw new Error('A perspectiva Ambição Estratégica é reservada pelo sistema')
  }

  const result = await prisma.perspective.create({
    data: {
      tenantId: session.user.tenantId,
      ...validatedData,
    },
  })

  revalidatePath('/app/admin/config')
  return result
}

export async function updatePerspective(id: string, data: z.infer<typeof perspectiveSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const validatedData = perspectiveSchema.parse(data)

  const existing = await prisma.perspective.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    select: { name: true },
  })

  if (!existing) {
    throw new Error('Perspective not found')
  }

  if (isAmbitionPerspectiveName(existing.name)) {
    throw new Error('A perspectiva Ambição Estratégica é reservada e não pode ser alterada')
  }

  if (isAmbitionPerspectiveName(validatedData.name)) {
    throw new Error('A perspectiva Ambição Estratégica é reservada pelo sistema')
  }

  const result = await prisma.perspective.update({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    data: validatedData,
  })

  revalidatePath('/app/admin/config')
  return result
}

export async function deletePerspective(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const existing = await prisma.perspective.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    select: { name: true },
  })

  if (!existing) {
    throw new Error('Perspective not found')
  }

  if (isAmbitionPerspectiveName(existing.name)) {
    throw new Error('A perspectiva Ambição Estratégica é reservada e não pode ser excluída')
  }

  await prisma.perspective.delete({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  revalidatePath('/app/admin/config')
}
