import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserOrgScope } from '@/lib/domain/org-scope'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scope = await getUserOrgScope(session.user.id, session.user.tenantId)
    const availableNodes = await prisma.orgNode.findMany({
      where: {
        tenantId: session.user.tenantId,
        id: { in: scope.viewableNodeIds },
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        type: {
          select: {
            name: true,
            key: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const preference = await prisma.userPreference.findUnique({
      where: {
        tenantId_userId: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
        },
      },
      select: { activeOrgNodeId: true },
    })

    const hasValidPreference = Boolean(
      preference?.activeOrgNodeId && availableNodes.some((node) => node.id === preference.activeOrgNodeId),
    )

    const companyNode = availableNodes.find((node) => node.parentId === null && node.type.key === 'company')
    const rootNode = companyNode || availableNodes.find((node) => node.parentId === null)
    const fallbackActiveOrgNodeId = rootNode?.id || availableNodes[0]?.id || null
    const activeOrgNodeId = hasValidPreference ? preference!.activeOrgNodeId! : fallbackActiveOrgNodeId

    if (!hasValidPreference && activeOrgNodeId) {
      await prisma.userPreference.upsert({
        where: {
          tenantId_userId: {
            tenantId: session.user.tenantId,
            userId: session.user.id,
          },
        },
        update: { activeOrgNodeId },
        create: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
          activeOrgNodeId,
        },
      })
    }

    const activeNode = availableNodes.find((node) => node.id === activeOrgNodeId)

    const activeContext = activeNode
      ? {
          name: activeNode.name,
          type: activeNode.type.name,
        }
      : null

    return NextResponse.json({
      activeContext,
      activeOrgNodeId,
      availableNodes: availableNodes.map((node) => ({
        id: node.id,
        name: node.name,
        type: { name: node.type.name },
      })),
    })
  } catch (error) {
    console.error('Error fetching user context:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
