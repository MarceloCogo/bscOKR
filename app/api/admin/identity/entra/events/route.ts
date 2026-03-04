import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
  if (!permissions.canManageConfig) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [events, successCount24h, errorCount24h, lastSuccess, lastError] = await Promise.all([
    prisma.scimProvisioningEvent.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        operation: true,
        status: true,
        httpStatus: true,
        targetEmail: true,
        detail: true,
        createdAt: true,
      },
    }),
    prisma.scimProvisioningEvent.count({
      where: {
        tenantId: session.user.tenantId,
        status: 'success',
        createdAt: { gte: since24h },
      },
    }),
    prisma.scimProvisioningEvent.count({
      where: {
        tenantId: session.user.tenantId,
        status: 'error',
        createdAt: { gte: since24h },
      },
    }),
    prisma.scimProvisioningEvent.findFirst({
      where: {
        tenantId: session.user.tenantId,
        status: 'success',
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, operation: true },
    }),
    prisma.scimProvisioningEvent.findFirst({
      where: {
        tenantId: session.user.tenantId,
        status: 'error',
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, operation: true, detail: true, httpStatus: true },
    }),
  ])

  return NextResponse.json({
    summary: {
      successCount24h,
      errorCount24h,
      lastSuccessAt: lastSuccess?.createdAt || null,
      lastSuccessOperation: lastSuccess?.operation || null,
      lastErrorAt: lastError?.createdAt || null,
      lastErrorOperation: lastError?.operation || null,
      lastErrorDetail: lastError?.detail || null,
      lastErrorStatus: lastError?.httpStatus || null,
    },
    events,
  })
}
