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

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const searchTerm = query.toLowerCase()

    // Search objectives
    const objectives = await prisma.strategicObjective.findMany({
      where: {
        tenantId: session.user.tenantId,
        title: { contains: searchTerm, mode: 'insensitive' },
      },
      select: {
        id: true,
        title: true,
      },
      take: 10,
    })

    // Build results
    const results = objectives.map(obj => ({
      id: obj.id,
      title: obj.title,
      type: 'objective' as const,
      href: '/app/strategy/objectives',
    }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
