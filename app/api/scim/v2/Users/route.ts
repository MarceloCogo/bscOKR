import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resolveScimTenant } from '@/lib/scim/auth'
import { scimError, toScimUser } from '@/lib/scim/format'
import { generateTemporaryPassword } from '@/lib/security/temp-password'
import { hashPassword } from '@/lib/security/password'

const scimUserSelect: any = {
  id: true,
  externalId: true,
  email: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}

function parseName(body: any, fallbackEmail: string) {
  const displayName = body?.displayName?.trim()
  const formatted = body?.name?.formatted?.trim()
  const givenName = body?.name?.givenName?.trim()
  const familyName = body?.name?.familyName?.trim()
  const composed = [givenName, familyName].filter(Boolean).join(' ').trim()
  return displayName || formatted || composed || fallbackEmail
}

function parsePrimaryEmail(body: any): string | null {
  if (typeof body?.userName === 'string' && body.userName.trim()) {
    return body.userName.trim().toLowerCase()
  }

  const primary = Array.isArray(body?.emails)
    ? body.emails.find((email: any) => email?.primary) || body.emails[0]
    : null

  const value = primary?.value
  if (typeof value !== 'string' || !value.trim()) return null
  return value.trim().toLowerCase()
}

export async function GET(request: NextRequest) {
  const tenantId = await resolveScimTenant(request)
  if (!tenantId) {
    const err = scimError(401, 'Unauthorized')
    return NextResponse.json(err.body, { status: err.status })
  }

  const searchParams = request.nextUrl.searchParams
  const startIndex = Math.max(Number(searchParams.get('startIndex') || '1'), 1)
  const count = Math.min(Math.max(Number(searchParams.get('count') || '100'), 1), 200)
  const filter = searchParams.get('filter')

  const where: any = { tenantId }

  if (filter) {
    const match = filter.match(/^userName\s+eq\s+"(.+)"$/i)
    if (match?.[1]) {
      where.email = match[1].toLowerCase()
    }
  }

  const [totalResults, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: startIndex - 1,
      take: count,
      select: scimUserSelect,
    }),
  ])

  return NextResponse.json({
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults,
    startIndex,
    itemsPerPage: users.length,
    Resources: users.map((user: any) =>
      toScimUser({
        id: user.id,
        externalId: user.externalId,
        email: user.email,
        name: user.name,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }),
    ),
  })
}

export async function POST(request: NextRequest) {
  const tenantId = await resolveScimTenant(request)
  if (!tenantId) {
    const err = scimError(401, 'Unauthorized')
    return NextResponse.json(err.body, { status: err.status })
  }

  const body = await request.json()
  const email = parsePrimaryEmail(body)
  if (!email) {
    const err = scimError(400, 'userName or emails is required', 'invalidValue')
    return NextResponse.json(err.body, { status: err.status })
  }

  const name = parseName(body, email)
  const active = typeof body?.active === 'boolean' ? body.active : true

  const existing = await prisma.user.findUnique({
    where: {
      tenantId_email: {
        tenantId,
        email,
      },
    },
    select: { id: true },
  })

  if (existing) {
    const err = scimError(409, 'User already exists', 'uniqueness')
    return NextResponse.json(err.body, { status: err.status })
  }

  const temporaryPassword = generateTemporaryPassword()
  const passwordHash = await hashPassword(temporaryPassword)

  const created: any = await prisma.user.create({
    data: {
      tenantId,
      email,
      name,
      passwordHash,
      mustChangePassword: true,
      identityProvider: 'entra',
      externalId: typeof body?.externalId === 'string' ? body.externalId : null,
      isActive: active,
    } as any,
    select: scimUserSelect,
  })

  return NextResponse.json(
    toScimUser({
      id: created.id,
      externalId: created.externalId,
      email: created.email,
      name: created.name,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    }),
    { status: 201 },
  )
}
