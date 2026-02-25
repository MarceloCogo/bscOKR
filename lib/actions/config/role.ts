'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

const roleSchema = z.object({
  key: z.string().min(1, 'Chave é obrigatória').regex(/^[a-z0-9_-]+$/, 'Chave deve conter apenas letras minúsculas, números, hífen ou underscore'),
  name: z.string().min(1, 'Nome é obrigatório'),
  permissionsJson: z.string().min(1, 'Permissões são obrigatórias'),
}).refine((data) => {
  try {
    JSON.parse(data.permissionsJson)
    return true
  } catch {
    return false
  }
}, {
  message: 'Permissões devem ser um JSON válido',
  path: ['permissionsJson'],
})

export async function listRoles() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  return await prisma.role.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { name: 'asc' },
  })
}

export async function createRole(data: z.infer<typeof roleSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const validatedData = roleSchema.parse(data)

  const existing = await prisma.role.findFirst({
    where: {
      tenantId: session.user.tenantId,
      key: validatedData.key,
    },
  })

  if (existing) {
    throw new Error('Chave já existe')
  }

  const result = await prisma.role.create({
    data: {
      tenantId: session.user.tenantId,
      ...validatedData,
    },
  })

  revalidatePath('/app/admin/config')
  return result
}

export async function updateRole(id: string, data: z.infer<typeof roleSchema>) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const validatedData = roleSchema.parse(data)

  const existing = await prisma.role.findFirst({
    where: {
      tenantId: session.user.tenantId,
      key: validatedData.key,
      id: { not: id },
    },
  })

  if (existing) {
    throw new Error('Chave já existe')
  }

  const result = await prisma.role.update({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
    data: validatedData,
  })

  revalidatePath('/app/admin/config')
  return result
}

export async function deleteRole(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  // Prevent deletion of admin role
  const role = await prisma.role.findUnique({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  if (role?.key === 'admin') {
    throw new Error('Não é possível excluir o papel de administrador')
  }

  await prisma.role.delete({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  revalidatePath('/app/admin/config')
}