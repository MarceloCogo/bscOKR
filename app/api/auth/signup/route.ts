import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/security/password'
import { bootstrapTenantConfig } from '@/lib/bootstrap/tenant'
import { generateUniqueSlug } from '@/lib/utils/slug'

const signupSchema = z.object({
  tenantName: z.string().min(1, 'Nome da organização é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  adminSecret: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantName, name, email, password, adminSecret } = signupSchema.parse(body)

    // Check if email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já cadastrado' },
        { status: 400 }
      )
    }

    // Generate unique slug for tenant
    const slug = await generateUniqueSlug(
      tenantName,
      async (slug) => {
        const existingTenant = await prisma.tenant.findUnique({
          where: { slug },
        })
        return !!existingTenant
      }
    )

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug,
      },
    })

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name,
        email,
        passwordHash,
      },
    })

    // Check admin secret
    let isAdmin = false
    if (adminSecret) {
      if (adminSecret === process.env.ADMIN_SECRET) {
        isAdmin = true
        console.log(`[ADMIN_SECRET] Usuário ${email} usou segredo correto para se tornar admin`)
      } else {
        return NextResponse.json(
          { error: 'Código de administrador inválido' },
          { status: 400 }
        )
      }
    }

    // Always bootstrap tenant configuration (creates roles, perspectives, etc.)
    await bootstrapTenantConfig(tenant.id)

    // Create first organizational node (company)
    const companyType = await prisma.orgNodeType.findFirst({
      where: {
        tenantId: tenant.id,
        key: 'company',
      },
    })

    let firstOrgNode = null
    if (companyType) {
      firstOrgNode = await prisma.orgNode.create({
        data: {
          tenantId: tenant.id,
          name: tenantName,
          typeId: companyType.id,
        },
      })

      // Add user as primary member and leader of the company
      await prisma.orgNodeMembership.create({
        data: {
          tenantId: tenant.id,
          orgNodeId: firstOrgNode.id,
          userId: user.id,
          isPrimary: true,
        },
      })

      // Set user as leader
      await prisma.orgNode.update({
        where: { id: firstOrgNode.id },
        data: { leaderUserId: user.id },
      })
    }

    // Get appropriate role
    const roleKey = isAdmin ? 'admin' : 'member'
    const role = await prisma.role.findFirst({
      where: {
        tenantId: tenant.id,
        key: roleKey,
      },
    })

    // Assign role to user
    if (role) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      })
    }

    // Set active context for the user
    if (firstOrgNode) {
      await prisma.userPreference.upsert({
        where: {
          tenantId_userId: {
            tenantId: tenant.id,
            userId: user.id,
          },
        },
        update: {
          activeOrgNodeId: firstOrgNode.id,
        },
        create: {
          tenantId: tenant.id,
          userId: user.id,
          activeOrgNodeId: firstOrgNode.id,
        },
      })
    }

    return NextResponse.json({
      message: 'Conta criada com sucesso',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}