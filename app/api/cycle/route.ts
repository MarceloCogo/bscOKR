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

    const cycles = await prisma.cycle.findMany({
      where: { tenantId: session.user.tenantId },
      include: {
        status: true,
      },
      orderBy: { orderIndex: 'asc' },
    })

    return NextResponse.json({ cycles })
  } catch (error) {
    console.error('Error fetching cycles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, key, startDate, endDate, statusId, generateMultiple } = body

    if (!name || !key || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'name, key, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    // Get max order index
    const maxOrder = await prisma.cycle.aggregate({
      where: { tenantId: session.user.tenantId },
      _max: { orderIndex: true },
    })

    const cycle = await prisma.cycle.create({
      data: {
        tenantId: session.user.tenantId,
        name,
        key,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        statusId,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
      include: {
        status: true,
      },
    })

    return NextResponse.json({ cycle })
  } catch (error) {
    console.error('Error creating cycle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
