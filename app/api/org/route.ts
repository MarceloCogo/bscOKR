import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all org nodes where user has membership
    const orgNodes = await prisma.orgNode.findMany({
      where: {
        tenantId: session.user.tenantId,
        memberships: {
          some: {
            userId: session.user.id,
          },
        },
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