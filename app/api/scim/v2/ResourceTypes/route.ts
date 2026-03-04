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
    operation: 'resource-types.get',
    status: 'success',
    httpStatus: 200,
    request,
  })

  return NextResponse.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 1,
    startIndex: 1,
    itemsPerPage: 1,
    Resources: [
      {
        id: 'User',
        name: 'User',
        endpoint: '/Users',
        description: 'User Account',
        schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
      },
    ],
  })
}
