import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const objectives = await prisma.strategicObjective.findMany({
      where: { tenantId: session.user.tenantId },
      select: {
        id: true,
        title: true,
      },
      orderBy: { title: 'asc' },
    })

    return NextResponse.json({ objectives })
  } catch (error) {
    console.error('Error fetching objectives:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
