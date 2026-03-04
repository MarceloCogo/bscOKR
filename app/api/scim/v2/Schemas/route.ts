import { NextRequest, NextResponse } from 'next/server'
import { resolveScimTenant } from '@/lib/scim/auth'
import { logScimEvent } from '@/lib/scim/audit'

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

  await logScimEvent({
    tenantId,
    operation: 'schemas.get',
    status: 'success',
    httpStatus: 200,
    request,
  })

  return NextResponse.json({
    Resources: [
      {
        id: 'urn:ietf:params:scim:schemas:core:2.0:User',
        name: 'User',
        description: 'SCIM core User',
        attributes: [
          { name: 'userName', type: 'string', required: true, mutability: 'readWrite', returned: 'default' },
          { name: 'name', type: 'complex', required: false, mutability: 'readWrite', returned: 'default' },
          { name: 'displayName', type: 'string', required: false, mutability: 'readWrite', returned: 'default' },
          { name: 'emails', type: 'complex', required: false, multiValued: true, mutability: 'readWrite', returned: 'default' },
          { name: 'active', type: 'boolean', required: false, mutability: 'readWrite', returned: 'default' },
          { name: 'externalId', type: 'string', required: false, mutability: 'readWrite', returned: 'default' },
        ],
      },
    ],
    totalResults: 1,
    itemsPerPage: 1,
    startIndex: 1,
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
  })
}
