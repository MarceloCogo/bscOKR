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

    const cycle = await prisma.cycle.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        status: true,
      },
    })

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    return NextResponse.json({ cycle })
  } catch (error) {
    console.error('Error fetching cycle:', error)
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

    const existing = await prisma.cycle.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    // If activating, deactivate others
    if (body.isActive) {
      await prisma.cycle.updateMany({
        where: {
          tenantId: session.user.tenantId,
          id: { not: id },
        },
        data: { isActive: false },
      })
    }

    const cycle = await prisma.cycle.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.key && { key: body.key }),
        ...(body.startDate && { startDate: new Date(body.startDate) }),
        ...(body.endDate && { endDate: new Date(body.endDate) }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.statusId !== undefined && { statusId: body.statusId }),
      },
      include: {
        status: true,
      },
    })

    return NextResponse.json({ cycle })
  } catch (error) {
    console.error('Error updating cycle:', error)
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

    const existing = await prisma.cycle.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    await prisma.cycle.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting cycle:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
