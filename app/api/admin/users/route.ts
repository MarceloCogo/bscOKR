import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'
import { hashPassword } from '@/lib/security/password'
import { generateTemporaryPassword } from '@/lib/security/temp-password'

const createUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  roleId: z.string().min(1, 'Grupo é obrigatório'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
    if (!permissions.canManageUsers && !permissions.canManageConfig) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, email, roleId } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    const existingUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: session.user.tenantId,
          email: normalizedEmail,
        },
      },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado neste tenant' }, { status: 400 })
    }

    const role = await prisma.role.findFirst({
      where: { id: roleId, tenantId: session.user.tenantId },
      select: { id: true },
    })

    if (!role) {
      return NextResponse.json({ error: 'Grupo de acesso inválido' }, { status: 400 })
    }

    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await hashPassword(temporaryPassword)

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          tenantId: session.user.tenantId,
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          mustChangePassword: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          mustChangePassword: true,
        },
      })

      await tx.userRole.create({
        data: {
          userId: createdUser.id,
          roleId: role.id,
        },
      })

      return createdUser
    })

    return NextResponse.json({
      user,
      temporaryPassword,
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
