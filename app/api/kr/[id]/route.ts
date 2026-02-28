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

    if (!keyResult) {
      return NextResponse.json({ error: 'Key Result not found' }, { status: 404 })
    }

    return NextResponse.json({ keyResult })
  } catch (error) {
    console.error('Error fetching key result:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.targetValue !== undefined && { targetValue: body.targetValue }),
        ...(body.currentValue !== undefined && { currentValue: body.currentValue }),
        ...(body.metricTypeId !== undefined && { metricTypeId: body.metricTypeId }),
        ...(body.unit !== undefined && { unit: body.unit }),
        ...(body.statusId !== undefined && { statusId: body.statusId }),
        ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
        ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
        ...(body.orderIndex !== undefined && { orderIndex: body.orderIndex }),
      },
      include: {
        metricType: true,
        status: true,
      },
    })

    return NextResponse.json({ keyResult })
  } catch (error) {
    console.error('Error updating key result:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

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

    await prisma.keyResult.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting key result:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
