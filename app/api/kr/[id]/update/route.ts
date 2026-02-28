import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { currentValue } = body

    if (typeof currentValue !== 'number' || currentValue < 0) {
      return NextResponse.json(
        { error: 'currentValue must be a positive number' },
        { status: 400 }
      )
    }

    // Verify key result belongs to tenant
    const existing = await prisma.keyResult.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Key Result not found' }, { status: 404 })
    }

    const keyResult = await prisma.keyResult.update({
      where: { id },
      data: { currentValue },
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
    })

    return NextResponse.json({ keyResult })
  } catch (error) {
    console.error('Error updating key result value:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
