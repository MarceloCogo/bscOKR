import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveScimTenant } from '@/lib/scim/auth'
import { scimError, toScimUser } from '@/lib/scim/format'

const scimUserSelect: any = {
  id: true,
  externalId: true,
  email: true,
  name: true,
  isActive: true,
  createdAt: true,
}

function extractPatchedValue(operations: any[], path: string): any {
  const operation = operations.find((op) => (op.path || '').toLowerCase() === path.toLowerCase())
  return operation?.value
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = await resolveScimTenant(request)
    if (!tenantId) {
      const err = scimError(401, 'Unauthorized')
      return NextResponse.json(err.body, { status: err.status })
    }

    const { id } = await params
    const user: any = await prisma.user.findFirst({
      where: {
        id,
        tenantId,
      },
      select: scimUserSelect,
    })

    if (!user) {
      const err = scimError(404, 'User not found')
      return NextResponse.json(err.body, { status: err.status })
    }

    return NextResponse.json(
      toScimUser({
        id: user.id,
        externalId: user.externalId,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        createdAt: user.createdAt,
      }),
    )
  } catch (error) {
    console.error('SCIM User GET error:', error)
    const err = scimError(500, 'Internal Server Error')
    return NextResponse.json(err.body, { status: err.status })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = await resolveScimTenant(request)
    if (!tenantId) {
      const err = scimError(401, 'Unauthorized')
      return NextResponse.json(err.body, { status: err.status })
    }

    const { id } = await params
    const body = await request.json()
    const operations = Array.isArray(body?.Operations) ? body.Operations : []

    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true, email: true, name: true },
    })

    if (!existing) {
      const err = scimError(404, 'User not found')
      return NextResponse.json(err.body, { status: err.status })
    }

    const activeValue = extractPatchedValue(operations, 'active')
    const displayNameValue = extractPatchedValue(operations, 'displayName')
    const userNameValue = extractPatchedValue(operations, 'userName')

    const replaceOperations = operations.filter((op: any) => (op.op || '').toLowerCase() === 'replace')
    const replaceValue = replaceOperations.length === 1 && !replaceOperations[0].path ? replaceOperations[0].value : null

    const nextName =
      (typeof displayNameValue === 'string' && displayNameValue.trim()) ||
      (typeof replaceValue?.displayName === 'string' && replaceValue.displayName.trim()) ||
      (typeof replaceValue?.name?.formatted === 'string' && replaceValue.name.formatted.trim()) ||
      existing.name

    const nextEmail =
      (typeof userNameValue === 'string' && userNameValue.trim().toLowerCase()) ||
      (typeof replaceValue?.userName === 'string' && replaceValue.userName.trim().toLowerCase()) ||
      (Array.isArray(replaceValue?.emails) && typeof replaceValue.emails[0]?.value === 'string'
        ? replaceValue.emails[0].value.trim().toLowerCase()
        : existing.email)

    const updated: any = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: nextName,
        email: nextEmail,
        ...(typeof activeValue === 'boolean' ? { isActive: activeValue } : {}),
        ...(typeof replaceValue?.active === 'boolean' ? { isActive: replaceValue.active } : {}),
      } as any,
      select: scimUserSelect,
    })

    return NextResponse.json(
      toScimUser({
        id: updated.id,
        externalId: updated.externalId,
        email: updated.email,
        name: updated.name,
        isActive: updated.isActive,
        createdAt: updated.createdAt,
      }),
    )
  } catch (error) {
    console.error('SCIM User PATCH error:', error)
    const err = scimError(500, 'Internal Server Error')
    return NextResponse.json(err.body, { status: err.status })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = await resolveScimTenant(request)
    if (!tenantId) {
      const err = scimError(401, 'Unauthorized')
      return NextResponse.json(err.body, { status: err.status })
    }

    const { id } = await params
    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true },
    })

    if (!existing) {
      const err = scimError(404, 'User not found')
      return NextResponse.json(err.body, { status: err.status })
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        isActive: false,
      } as any,
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('SCIM User DELETE error:', error)
    const err = scimError(500, 'Internal Server Error')
    return NextResponse.json(err.body, { status: err.status })
  }
}
