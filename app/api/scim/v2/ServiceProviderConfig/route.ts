import { NextRequest, NextResponse } from 'next/server'
import { resolveScimTenant } from '@/lib/scim/auth'

export async function GET(request: NextRequest) {
  const tenantId = await resolveScimTenant(request)
  if (!tenantId) {
    return NextResponse.json(
      {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        status: '401',
        detail: 'Unauthorized',
      },
      { status: 401 },
    )
  }

  return NextResponse.json({
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 200 },
    changePassword: { supported: false },
    sort: { supported: true },
    etag: { supported: false },
    authenticationSchemes: [
      {
        name: 'OAuth Bearer Token',
        description: 'Authentication scheme using the Authorization header with a bearer token.',
        specUri: 'http://www.rfc-editor.org/info/rfc6750',
        type: 'oauthbearertoken',
        primary: true,
      },
    ],
  })
}
