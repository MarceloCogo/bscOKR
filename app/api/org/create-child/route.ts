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

    const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
    if (!permissions.canManageConfig) {
      return NextResponse.json({ error: 'Only admins can create organization nodes' }, { status: 403 })
    }

    const body = await request.json()
    const { parentId, name, type } = body

    if (!parentId || !name || !type) {
      return NextResponse.json(
        { error: 'parentId, name, and type are required' },
        { status: 400 }
      )
    }

    // Verify parent exists
    const parentNode = await prisma.orgNode.findFirst({
      where: {
        id: parentId,
        tenantId: session.user.tenantId,
      },
    })

    if (!parentNode) {
      return NextResponse.json(
        { error: 'Parent node not found or access denied' },
        { status: 404 }
      )
    }

    // Get the org node type
    const orgNodeType = await prisma.orgNodeType.findFirst({
      where: {
        tenantId: session.user.tenantId,
        key: type,
      },
    })

    if (!orgNodeType) {
      return NextResponse.json(
        { error: 'Invalid organization type' },
        { status: 400 }
      )
    }

    // Create the child node
    const childNode = await prisma.orgNode.create({
      data: {
        tenantId: session.user.tenantId,
        name,
        typeId: orgNodeType.id,
        parentId: parentNode.id,
      },
    })

    // Add user as member of the child
    await prisma.orgNodeMembership.create({
      data: {
        tenantId: session.user.tenantId,
        orgNodeId: childNode.id,
        userId: session.user.id,
        isPrimary: false,
      },
    })

    return NextResponse.json({ childNode })
  } catch (error) {
    console.error('Error creating child org node:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
