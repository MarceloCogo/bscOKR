import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/security/password'

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
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

    const user = await prisma.user.findFirst({
      where: {
        id: session.user.id,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
        mustChangePassword: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const passwordHash = await hashPassword(parsed.data.newPassword)

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
    console.error('Error changing first access password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
