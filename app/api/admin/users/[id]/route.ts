import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getUserPermissions } from '@/lib/domain/permissions'

const updateUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  email: z.string().email('Email inválido').optional(),
})

async function ensureAccess() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId || !session.user.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
  if (!permissions.canManageUsers && !permissions.canManageConfig) {
    return { error: NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 }) }
  }

  return { session }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await ensureAccess()
    if ('error' in access) return access.error

    const { id } = await params
    const body = await request.json()
    const parsed = updateUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { session } = access
    const target = await prisma.user.findFirst({
      where: { id, tenantId: session.user.tenantId },
      select: { id: true },
    })

    if (!target) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    if (parsed.data.email) {
      const normalizedEmail = parsed.data.email.toLowerCase().trim()
      const existing = await prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId: session.user.tenantId,
            email: normalizedEmail,
          },
        },
        select: { id: true },
      })

      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Email já cadastrado neste tenant' }, { status: 400 })
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.email ? { email: parsed.data.email.toLowerCase().trim() } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await ensureAccess()
    if ('error' in access) return access.error

    const { id } = await params
    const { session } = access

    if (id === session.user.id) {
      return NextResponse.json({ error: 'Não é possível remover seu próprio usuário' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { id, tenantId: session.user.tenantId },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const isAdmin = user.userRoles.some((ur) => ur.role.key === 'admin')
    if (isAdmin) {
      const adminCount = await prisma.userRole.count({
        where: {
          role: {
            tenantId: session.user.tenantId,
            key: 'admin',
          },
        },
      })

      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Não é possível remover o último admin' }, { status: 400 })
      }
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
