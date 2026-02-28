import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get count of KRs per objective
    const krCounts = await prisma.keyResult.groupBy({
      by: ['objectiveId'],
      where: {
        tenantId: session.user.tenantId,
      },
      _count: {
        id: true,
      },
    })

    // Convert to map format
    const krStatusMap: Record<string, boolean> = {}
    krCounts.forEach(count => {
      krStatusMap[count.objectiveId] = count._count.id > 0
    })

    return NextResponse.json({ krStatusMap })
  } catch (error) {
    console.error('Error fetching KR counts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
