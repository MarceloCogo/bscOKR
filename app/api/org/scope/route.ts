import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserOrgScope } from '@/lib/domain/org-scope'
import { getUserOrgContext } from '@/lib/actions/org'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [scope, context] = await Promise.all([
      getUserOrgScope(session.user.id, session.user.tenantId),
      getUserOrgContext(),
    ])

    const [viewableNodes, editableNodes] = await Promise.all([
      prisma.orgNode.findMany({
        where: { tenantId: session.user.tenantId, id: { in: scope.viewableNodeIds } },
        include: { type: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.orgNode.findMany({
        where: { tenantId: session.user.tenantId, id: { in: scope.editableNodeIds } },
        include: { type: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    return NextResponse.json({
      viewableNodes,
      editableNodes,
      activeOrgNodeId: context.activeOrgNodeId,
      primaryOrgNodeId: context.primaryOrgNode?.id || null,
    })
  } catch (error) {
    console.error('Error fetching org scope:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
