import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createConsentState, hashConsentNonce } from '@/lib/security/consent-state'
import { prisma } from '@/lib/db'
import { getEntraClientId, getEntraTenantId } from '@/lib/security/entra-config'
import { getUserPermissions } from '@/lib/domain/permissions'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.tenantId || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
    if (!permissions.canManageConfig) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const clientId = getEntraClientId()
    if (!clientId) {
      return NextResponse.json(
        {
          error:
            'Entra ID não configurado no servidor. Defina ENTRA_CLIENT_ID (ou AZURE_AD_CLIENT_ID).',
        },
        { status: 500 },
      )
    }

    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin
    const redirectUri = `${baseUrl}/api/auth/entra/admin-consent/callback`
    const statePayload = createConsentState({ tenantId: session.user.tenantId, userId: session.user.id })
    const parsedState = JSON.parse(Buffer.from(statePayload.split('.')[0], 'base64url').toString('utf8')) as { nonce: string; exp: number }

    await prisma.authConsentNonce.create({
      data: {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        nonceHash: hashConsentNonce(parsedState.nonce),
        expiresAt: new Date(parsedState.exp * 1000),
      },
    })

    const configuredTenant = (getEntraTenantId() || '').trim().toLowerCase()
    const consentTenant =
      configuredTenant &&
      configuredTenant !== 'common' &&
      configuredTenant !== 'consumers' &&
      configuredTenant !== 'organizations'
        ? configuredTenant
        : 'organizations'

    const consentUrl = new URL(`https://login.microsoftonline.com/${consentTenant}/v2.0/adminconsent`)
    consentUrl.searchParams.set('client_id', clientId)
    consentUrl.searchParams.set('redirect_uri', redirectUri)
    consentUrl.searchParams.set('state', statePayload)

    return NextResponse.json({ consentUrl: consentUrl.toString() })
  } catch (error) {
    console.error('Error starting Entra admin consent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
