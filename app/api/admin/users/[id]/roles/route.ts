import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'

const updateRolesSchema = z.object({
  roleIds: z.array(z.string().min(1)).min(1, 'Selecione ao menos um grupo de acesso'),
})

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const body = await request.json()
    const parsed = updateRolesSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const targetUser = await prisma.user.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const roles = await prisma.role.findMany({
      where: {
        tenantId: session.user.tenantId,
        id: { in: parsed.data.roleIds },
      },
      select: { id: true, key: true },
    })

    if (roles.length !== parsed.data.roleIds.length) {
      return NextResponse.json({ error: 'Um ou mais grupos são inválidos' }, { status: 400 })
    }

    const currentlyAdmin = targetUser.userRoles.some((userRole) => userRole.role.key === 'admin')
    const willBeAdmin = roles.some((role) => role.key === 'admin')

    if (currentlyAdmin && !willBeAdmin) {
      const adminCount = await prisma.userRole.count({
        where: {
          role: {
            tenantId: session.user.tenantId,
            key: 'admin',
          },
        },
      })

      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Não é possível remover o último admin' }, { status: 400 })
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } })
      await tx.userRole.createMany({
        data: parsed.data.roleIds.map((roleId) => ({ userId: id, roleId })),
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
