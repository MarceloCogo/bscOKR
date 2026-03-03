import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
    if (!permissions.canManageUsers && !permissions.canManageConfig) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const userSelect: any = {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      mustChangePassword: true,
      lastLoginAt: true,
      lastSeenAt: true,
      lastLoginIp: true,
      lastSeenIp: true,
      userRoles: {
        include: {
          role: { select: { id: true, name: true, key: true } },
        },
      },
    }

    const users: any[] = await prisma.user.findMany({
      where: { tenantId: session.user.tenantId },
      select: userSelect,
      orderBy: { name: 'asc' },
    })

    const onlineThreshold = Date.now() - 5 * 60 * 1000
    const enrichedUsers = users.map((user: any) => {
      const lastSeen = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : 0
      return {
        ...user,
        isOnline: Boolean(lastSeen && lastSeen >= onlineThreshold),
      }
    })

    return NextResponse.json(enrichedUsers)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
