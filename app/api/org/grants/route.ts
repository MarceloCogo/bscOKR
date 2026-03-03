import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'

const createGrantSchema = z.object({
  orgNodeId: z.string().min(1),
  granteeType: z.enum(['ROLE', 'USER']),
  granteeId: z.string().min(1),
  permission: z.enum(['VIEW', 'EDIT']),
  includeDescendants: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
    if (!permissions.canManageConfig && !permissions.canManageUsers) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const orgNodeId = request.nextUrl.searchParams.get('orgNodeId')
    if (!orgNodeId) {
      return NextResponse.json({ error: 'orgNodeId is required' }, { status: 400 })
    }

    const grants: any[] = await prisma.orgNodeAccessGrant.findMany({
      where: {
        tenantId: session.user.tenantId,
        orgNodeId,
      },
      orderBy: { createdAt: 'desc' },
    })

    const [userIds, roleIds] = grants.reduce(
      (acc: [string[], string[]], grant: any) => {
        if (grant.granteeType === 'USER') acc[0].push(grant.granteeId)
        if (grant.granteeType === 'ROLE') acc[1].push(grant.granteeId)
        return acc
      },
      [[], []] as [string[], string[]],
    )

    const [users, roles] = await Promise.all([
      userIds.length > 0
        ? prisma.user.findMany({
            where: { tenantId: session.user.tenantId, id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      roleIds.length > 0
        ? prisma.role.findMany({
            where: { tenantId: session.user.tenantId, id: { in: roleIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ])

    const userMap = new Map(users.map((user) => [user.id, user.name || user.email]))
    const roleMap = new Map(roles.map((role) => [role.id, role.name]))

    const grantsWithNames = grants.map((grant: any) => ({
      ...grant,
      granteeName: grant.granteeType === 'USER' ? userMap.get(grant.granteeId) : roleMap.get(grant.granteeId),
    }))

    return NextResponse.json({ grants: grantsWithNames })
  } catch (error) {
    console.error('Error listing org grants:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
    if (!permissions.canManageConfig && !permissions.canManageUsers) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createGrantSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const payload = parsed.data

    const node = await prisma.orgNode.findFirst({
      where: {
        id: payload.orgNodeId,
        tenantId: session.user.tenantId,
      },
      select: { id: true },
    })

    if (!node) {
      return NextResponse.json({ error: 'Org node not found' }, { status: 404 })
    }

    if (payload.granteeType === 'ROLE') {
      const role = await prisma.role.findFirst({
        where: {
          id: payload.granteeId,
          tenantId: session.user.tenantId,
        },
        select: { id: true },
      })
      if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    } else {
      const user = await prisma.user.findFirst({
        where: {
          id: payload.granteeId,
          tenantId: session.user.tenantId,
        },
        select: { id: true },
      })
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const grant = await prisma.orgNodeAccessGrant.upsert({
      where: {
        tenantId_orgNodeId_granteeType_granteeId_permission: {
          tenantId: session.user.tenantId,
          orgNodeId: payload.orgNodeId,
          granteeType: payload.granteeType as any,
          granteeId: payload.granteeId,
          permission: payload.permission as any,
        },
      },
      update: {
        includeDescendants: payload.includeDescendants,
      },
        create: {
          tenantId: session.user.tenantId,
          orgNodeId: payload.orgNodeId,
          granteeType: payload.granteeType as any,
          granteeId: payload.granteeId,
          permission: payload.permission as any,
          includeDescendants: payload.includeDescendants,
        },
    })

    return NextResponse.json({ grant })
  } catch (error) {
    console.error('Error creating org grant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
    if (!permissions.canManageConfig && !permissions.canManageUsers) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    await prisma.orgNodeAccessGrant.deleteMany({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting org grant:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
