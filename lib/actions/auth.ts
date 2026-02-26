import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function getPostLoginRedirect() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    return '/login'
  }

  // Check if user has any org nodes
  const orgNodesCount = await prisma.orgNode.count({
    where: {
      tenantId: session.user.tenantId,
    },
  })

  if (orgNodesCount === 0) {
    // No org nodes - needs onboarding
    return '/app/organization?onboarding=true'
  }

  // Check if user has active context
  const userPreference = await prisma.userPreference.findUnique({
    where: {
      tenantId_userId: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
      },
    },
  })

  if (!userPreference?.activeOrgNodeId) {
    // Has org nodes but no active context - auto-select first one
    const firstOrgNode = await prisma.orgNode.findFirst({
      where: {
        tenantId: session.user.tenantId,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    })

    if (firstOrgNode) {
      // Auto-set as active context
      await prisma.userPreference.upsert({
        where: {
          tenantId_userId: {
            tenantId: session.user.tenantId,
            userId: session.user.id,
          },
        },
        update: {
          activeOrgNodeId: firstOrgNode.id,
        },
        create: {
          tenantId: session.user.tenantId,
          userId: session.user.id,
          activeOrgNodeId: firstOrgNode.id,
          viewedHints: [],
        },
      })
    }
  }

  // User is ready to see the strategy map
  return '/app/strategy/map'
}