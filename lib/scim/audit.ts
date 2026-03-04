import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

type ScimAuditInput = {
  tenantId: string
  operation: string
  status: 'success' | 'error'
  httpStatus: number
  request: NextRequest
  detail?: string
  targetUserId?: string | null
  targetEmail?: string | null
  externalId?: string | null
}

export async function logScimEvent(input: ScimAuditInput) {
  try {
    await prisma.scimProvisioningEvent.create({
      data: {
        tenantId: input.tenantId,
        operation: input.operation,
        status: input.status,
        httpMethod: input.request.method,
        httpPath: input.request.nextUrl.pathname,
        httpStatus: input.httpStatus,
        detail: input.detail || null,
        targetUserId: input.targetUserId || null,
        targetEmail: input.targetEmail || null,
        externalId: input.externalId || null,
      },
    })
  } catch (error) {
    console.error('SCIM audit log error:', error)
  }
}
