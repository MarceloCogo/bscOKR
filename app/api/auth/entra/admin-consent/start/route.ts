import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createConsentState } from '@/lib/security/consent-state'
import { prisma } from '@/lib/db'
import { getEntraClientId } from '@/lib/security/entra-config'

const startSchema = z.object({
  tenantSlug: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = startSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'tenantSlug is required' }, { status: 400 })
    }

    const tenantSlug = parsed.data.tenantSlug.trim().toLowerCase()

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true } })
    if (!tenant) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
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
    const state = createConsentState(tenantSlug)

    const consentUrl = new URL('https://login.microsoftonline.com/common/v2.0/adminconsent')
    consentUrl.searchParams.set('client_id', clientId)
    consentUrl.searchParams.set('redirect_uri', redirectUri)
    consentUrl.searchParams.set('state', state)

    return NextResponse.json({ consentUrl: consentUrl.toString() })
  } catch (error) {
    console.error('Error starting Entra admin consent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
