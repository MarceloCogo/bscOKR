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
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantName, name, email, password } = signupSchema.parse(body)

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

    // Assign admin role to user
    const adminRole = await prisma.role.findFirst({
      where: {
        tenantId: tenant.id,
        key: 'admin',
      },
    })

    if (adminRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      })
    }

    // Bootstrap tenant configuration
    await bootstrapTenantConfig(tenant.id)

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