import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/security/password'

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(8, 'Nova senha deve ter no mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { currentPassword, newPassword } = parsed.data

    const user = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Senha atual inválida' }, { status: 400 })
    }

    const isSamePassword = await verifyPassword(newPassword, user.passwordHash)
    if (isSamePassword) {
      return NextResponse.json({ error: 'A nova senha deve ser diferente da senha atual' }, { status: 400 })
    }

    const passwordHash = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
