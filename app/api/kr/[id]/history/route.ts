import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const keyResult = await prisma.keyResult.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      select: { id: true },
    })

    if (!keyResult) {
      return NextResponse.json({ error: 'Key Result not found' }, { status: 404 })
    }

    const history = await prisma.kRUpdateHistory.findMany({
      where: {
        keyResultId: id,
        tenantId: session.user.tenantId,
      },
      include: {
        updatedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 24,
    })

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error fetching KR history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
