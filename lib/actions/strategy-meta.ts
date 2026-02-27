'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

// Helper to get active context or throw
export async function getActiveContextOrThrow(userId: string, tenantId: string) {
  const pref = await prisma.userPreference.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  })

  const activeOrgNodeId = pref?.activeOrgNodeId
  if (!activeOrgNodeId) {
    const error = new Error('NO_ACTIVE_CONTEXT')
    ;(error as any).code = 'NO_ACTIVE_CONTEXT'
    throw error
  }
  return activeOrgNodeId
}

// Upsert strategy map meta
export async function upsertStrategyMapMeta(data: { ambitionText?: string; valuePropositionText?: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    throw new Error('Unauthorized')
  }

  const activeOrgNodeId = await getActiveContextOrThrow(session.user.id, session.user.tenantId)

  // DEV-only logging for consistency checking
  if (process.env.NODE_ENV === 'development') {
    console.debug('[upsertStrategyMapMeta] Save operation:', {
      tenantId: session.user.tenantId,
      activeOrgNodeId,
      data
    })
  }

  // Check permissions
  const userRoles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: true },
  })
  const permissions = userRoles.flatMap(ur => JSON.parse(ur.role.permissionsJson))
  const perms = permissions.reduce((acc, perm) => ({ ...acc, ...perm }), {})
  if (!perms.canManageConfig && !perms.canEditAll) {
    throw new Error('Insufficient permissions')
  }

  const result = await prisma.strategyMapMeta.upsert({
    where: {
      tenantId_orgNodeId: {
        tenantId: session.user.tenantId,
        orgNodeId: activeOrgNodeId,
      },
    },
    update: data,
    create: {
      tenantId: session.user.tenantId,
      orgNodeId: activeOrgNodeId,
      ...data,
    },
  })

  revalidatePath('/app/strategy')
  return result
}