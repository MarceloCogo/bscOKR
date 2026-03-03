import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'
import { randomBytes } from 'crypto'
import { hashScimToken } from '@/lib/security/scim-token'

function createScimToken() {
  return `scim_${randomBytes(24).toString('hex')}`
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
  if (!permissions.canManageConfig) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const config = await prisma.tenantIdentityProvider.findUnique({
    where: {
      tenantId_provider: {
        tenantId: session.user.tenantId,
        provider: 'entra',
      },
    },
  })

  return NextResponse.json({
    enabled: config?.enabled || false,
    entraTenantId: config?.entraTenantId || null,
    entraClientId: config?.entraClientId || null,
    scimTokenConfigured: Boolean(config?.scimTokenHash),
    scimTokenCreatedAt: config?.scimTokenCreatedAt || null,
  })
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
  if (!permissions.canManageConfig) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await request.json()

  const updated = await prisma.tenantIdentityProvider.upsert({
    where: {
      tenantId_provider: {
        tenantId: session.user.tenantId,
        provider: 'entra',
      },
    },
    update: {
      enabled: Boolean(body.enabled),
      entraTenantId: body.entraTenantId || null,
      entraClientId: body.entraClientId || null,
      entraClientSecret: body.entraClientSecret || null,
    },
    create: {
      tenantId: session.user.tenantId,
      provider: 'entra',
      enabled: Boolean(body.enabled),
      entraTenantId: body.entraTenantId || null,
      entraClientId: body.entraClientId || null,
      entraClientSecret: body.entraClientSecret || null,
    },
  })

  return NextResponse.json({
    success: true,
    enabled: updated.enabled,
  })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
  if (!permissions.canManageConfig) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  const plainToken = createScimToken()
  const tokenHash = hashScimToken(plainToken)

  await prisma.tenantIdentityProvider.upsert({
    where: {
      tenantId_provider: {
        tenantId: session.user.tenantId,
        provider: 'entra',
      },
    },
    update: {
      scimTokenHash: tokenHash,
      scimTokenCreatedAt: new Date(),
    },
    create: {
      tenantId: session.user.tenantId,
      provider: 'entra',
      enabled: false,
      scimTokenHash: tokenHash,
      scimTokenCreatedAt: new Date(),
    },
  })

  return NextResponse.json({
    success: true,
    scimToken: plainToken,
  })
}
