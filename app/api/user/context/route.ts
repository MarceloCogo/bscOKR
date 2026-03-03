import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserOrgContext } from '@/lib/actions/org'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userContext = await getUserOrgContext()

    const activeNode = userContext.availableNodes?.find((node) => node.id === userContext.activeOrgNodeId)

    const activeContext = activeNode
      ? {
          name: activeNode.name,
          type: activeNode.type.name,
        }
      : null

    return NextResponse.json({ activeContext })
  } catch (error) {
    console.error('Error fetching user context:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
