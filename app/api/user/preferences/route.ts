import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await prisma.userPreference.findUnique({
      where: {
        tenantId_userId: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
      },
    })

    return NextResponse.json({
      viewedHints: preferences?.viewedHints || [],
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { viewedHints } = body

    if (!Array.isArray(viewedHints)) {
      return NextResponse.json(
        { error: 'viewedHints must be an array' },
        { status: 400 }
      )
    }

    const preferences = await prisma.userPreference.upsert({
      where: {
        tenantId_userId: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
      },
      update: {
        viewedHints,
      },
      create: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        viewedHints,
      },
    })

    return NextResponse.json({
      viewedHints: preferences.viewedHints,
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}