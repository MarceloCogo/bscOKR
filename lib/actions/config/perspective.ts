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

  await prisma.perspective.delete({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  revalidatePath('/app/admin/config')
}