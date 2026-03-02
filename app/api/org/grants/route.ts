import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'
import { OrgAccessGranteeType, OrgAccessPermission } from '@prisma/client'

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

    const grants = await prisma.orgNodeAccessGrant.findMany({
      where: {
        tenantId: session.user.tenantId,
        orgNodeId,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ grants })
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
          granteeType: payload.granteeType as OrgAccessGranteeType,
          granteeId: payload.granteeId,
          permission: payload.permission as OrgAccessPermission,
        },
      },
      update: {
        includeDescendants: payload.includeDescendants,
      },
      create: {
        tenantId: session.user.tenantId,
        orgNodeId: payload.orgNodeId,
        granteeType: payload.granteeType as OrgAccessGranteeType,
        granteeId: payload.granteeId,
        permission: payload.permission as OrgAccessPermission,
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
