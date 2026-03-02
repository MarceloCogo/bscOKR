import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserOrgScope } from '@/lib/domain/org-scope'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scope = await getUserOrgScope(session.user.id, session.user.tenantId)

    // Get all org nodes the user can view in hierarchy
    const orgNodes = await prisma.orgNode.findMany({
      where: {
        tenantId: session.user.tenantId,
        id: { in: scope.viewableNodeIds },
      },
      include: {
        type: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(orgNodes)
  } catch (error) {
    console.error('Error fetching org nodes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
