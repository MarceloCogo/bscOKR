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
    const objectiveId = searchParams.get('objectiveId')

    const where: any = {
      tenantId: session.user.tenantId,
    }

    if (objectiveId) {
      where.objectiveId = objectiveId
    }

    const keyResults = await prisma.keyResult.findMany({
      where,
      include: {
        metricType: true,
        status: true,
        objective: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { orderIndex: 'asc' },
    })

    return NextResponse.json({ keyResults })
  } catch (error) {
    console.error('Error fetching key results:', error)
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
    const { objectiveId, title, description, targetValue, currentValue, metricTypeId, unit, statusId, startDate, endDate } = body

    if (!objectiveId || !title || targetValue === undefined) {
      return NextResponse.json(
        { error: 'objectiveId, title, and targetValue are required' },
        { status: 400 }
      )
    }

    // Verify objective belongs to tenant
    const objective = await prisma.strategicObjective.findFirst({
      where: {
        id: objectiveId,
        tenantId: session.user.tenantId,
      },
    })

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 })
    }

    // Get max order index
    const maxOrder = await prisma.keyResult.aggregate({
      where: { objectiveId },
      _max: { orderIndex: true },
    })

    const keyResult = await prisma.keyResult.create({
      data: {
        tenantId: session.user.tenantId,
        objectiveId,
        title,
        description,
        targetValue,
        currentValue: currentValue ?? 0,
        metricTypeId,
        unit: unit ?? '%',
        statusId,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
      include: {
        metricType: true,
        status: true,
      },
    })

    return NextResponse.json({ keyResult })
  } catch (error) {
    console.error('Error creating key result:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
