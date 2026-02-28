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

    const statuses = await prisma.cycleStatus.findMany({
      where: { tenantId: session.user.tenantId },
      select: { id: true, name: true, key: true },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ statuses })
  } catch (error) {
    console.error('Error fetching cycle statuses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
