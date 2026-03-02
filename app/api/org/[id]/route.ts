import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'

const updateOrgNodeSchema = z.object({
  name: z.string().min(1).max(120),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
    const { id } = await params

    const node = await prisma.orgNode.findFirst({
      where: { id, tenantId: session.user.tenantId },
      select: { id: true, leaderUserId: true },
    })

    if (!node) {
      return NextResponse.json({ error: 'Org node not found' }, { status: 404 })
    }

    const canManage = permissions.canManageConfig || permissions.canManageUsers
    const isLeader = node.leaderUserId === session.user.id
    if (!canManage && !isLeader) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateOrgNodeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const updatedNode = await prisma.orgNode.update({
      where: { id },
      data: { name: parsed.data.name.trim() },
      include: { type: true },
    })

    return NextResponse.json({ node: updatedNode })
  } catch (error) {
    console.error('Error updating org node:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
