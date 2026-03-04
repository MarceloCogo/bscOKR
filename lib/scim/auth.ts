import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { extractBearerToken, hashScimToken } from '@/lib/security/scim-token'

export async function resolveScimTenant(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('authorization'))
  if (!token) return null

  const tokenHash = hashScimToken(token)

  const provider = await prisma.tenantIdentityProvider.findFirst({
    where: {
      provider: 'entra',
      enabled: true,
      scimTokenHash: tokenHash,
    },
    select: {
      tenantId: true,
    },
  })

  if (!provider) return null
  return provider.tenantId
}
