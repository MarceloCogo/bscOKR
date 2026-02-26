import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    // Check if current user is admin
    const currentUserRoles = await prisma.userRole.findMany({
      where: {
        userId: session.user.id,
        role: { key: 'admin' }
      }
    })

    if (currentUserRoles.length === 0) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prevent removing the last admin
    const targetRole = await prisma.role.findUnique({
      where: { id: roleId },
      select: { key: true }
    })

    if (targetRole?.key !== 'admin') { // If changing from admin to non-admin
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

    // Update user role
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId,
        }
      },
      update: {
        roleId,
      },
      create: {
        userId,
        roleId,
      }
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