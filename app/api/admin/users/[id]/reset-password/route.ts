import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'
import { hashPassword } from '@/lib/security/password'
import { generateTemporaryPassword } from '@/lib/security/temp-password'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
    if (!permissions.canManageUsers && !permissions.canManageConfig) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      select: {
        id: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const temporaryPassword = generateTemporaryPassword()
    const passwordHash = await hashPassword(temporaryPassword)

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: null,
      },
    })

    return NextResponse.json({ success: true, temporaryPassword })
  } catch (error) {
    console.error('Error resetting user password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
