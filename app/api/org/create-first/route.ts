import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createFirstOrgSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type } = createFirstOrgSchema.parse(body)

    // Check if user already has org nodes
    const existingCount = await prisma.orgNode.count({
      where: {
        tenantId: session.user.tenantId,
      },
    })

    if (existingCount > 0) {
      return NextResponse.json(
        { error: 'Organization already exists' },
        { status: 400 }
      )
    }

    // Get the org node type
    const orgNodeType = await prisma.orgNodeType.findFirst({
      where: {
        tenantId: session.user.tenantId,
        key: type,
      },
    })

    if (!orgNodeType) {
      return NextResponse.json(
        { error: 'Invalid organization type' },
        { status: 400 }
      )
    }

    // Create the org node
    const orgNode = await prisma.orgNode.create({
      data: {
        tenantId: session.user.tenantId,
        name,
        typeId: orgNodeType.id,
      },
    })

    // Add user as member
    await prisma.orgNodeMembership.create({
      data: {
        tenantId: session.user.tenantId,
        orgNodeId: orgNode.id,
        userId: session.user.id,
        isPrimary: true,
      },
    })

    // Auto-set as active context
    await prisma.userPreference.upsert({
      where: {
        tenantId_userId: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
      },
      update: {
        activeOrgNodeId: orgNode.id,
      },
      create: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        activeOrgNodeId: orgNode.id,
      },
    })

    return NextResponse.json({ orgNode })

  } catch (error) {
    console.error('Error creating first organization:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}