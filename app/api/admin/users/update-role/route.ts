import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, roleId } = body

    if (!userId || !roleId) {
      return NextResponse.json(
        { error: 'userId and roleId are required' },
        { status: 400 }
      )
    }

    const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
    if (!permissions.canManageUsers && !permissions.canManageConfig) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: session.user.tenantId,
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent removing the last admin
    const targetRole = await prisma.role.findUnique({
      where: { id: roleId },
      select: { key: true, tenantId: true }
    })

    if (!targetRole || targetRole.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const currentlyAdmin = targetUser.userRoles.some((ur) => ur.role.key === 'admin')

    if (currentlyAdmin && targetRole?.key !== 'admin') {
      const adminCount = await prisma.userRole.count({
        where: {
          role: {
            key: 'admin',
            tenantId: session.user.tenantId,
          }
        }
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin user' },
          { status: 400 }
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } })
      await tx.userRole.create({
        data: {
          userId,
          roleId,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
