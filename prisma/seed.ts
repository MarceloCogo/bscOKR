import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/security/password'
import { bootstrapTenantConfig } from '../lib/bootstrap/tenant'

const prisma = new PrismaClient()

async function main() {
  // Only run seed in development
  if (process.env.APP_ENV !== 'development' && process.env.NODE_ENV === 'production') {
    console.log('Seed only runs in development environment')
    return
  }

  console.log('🌱 Starting seed...')

  // Check if development tenant already exists
  let tenant = await prisma.tenant.findUnique({
    where: { slug: 'local-dev' },
  })

  if (!tenant) {
    console.log('Creating development tenant...')
    tenant = await prisma.tenant.create({
      data: {
        name: 'Local Development',
        slug: 'local-dev',
      },
    })
    console.log('✅ Development tenant created')
  } else {
    console.log('✅ Development tenant already exists')
  }

  // Check if admin user already exists
  let user = await prisma.user.findUnique({
    where: {
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@local.dev',
      },
    },
  })

  if (!user) {
    console.log('Creating admin user...')
    const passwordHash = await hashPassword('admin123')

    user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: 'Admin',
        email: 'admin@local.dev',
        passwordHash,
      },
    })
    console.log('✅ Admin user created')
  } else {
    console.log('✅ Admin user already exists')
  }

  // Ensure admin role exists and user is assigned to it
  let adminRole = await prisma.role.findFirst({
    where: {
      tenantId: tenant.id,
      key: 'admin',
    },
  })

  if (!adminRole) {
    console.log('Creating admin role...')
    adminRole = await prisma.role.create({
      data: {
        tenantId: tenant.id,
        key: 'admin',
        name: 'Administrador',
        permissionsJson: JSON.stringify({
          canManageUsers: true,
          canManageConfig: true,
          canViewAll: true,
          canEditAll: true,
        }),
      },
    })
    console.log('✅ Admin role created')
  }

  // Assign admin role to user
  const existingUserRole = await prisma.userRole.findFirst({
    where: {
      userId: user.id,
      roleId: adminRole.id,
    },
  })

  if (!existingUserRole) {
    console.log('Assigning admin role to user...')
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
      },
    })
    console.log('✅ Admin role assigned to user')
  } else {
    console.log('✅ Admin role already assigned')
  }

  // Bootstrap tenant configuration if not already done
  const existingConfig = await prisma.perspective.count({
    where: { tenantId: tenant.id },
  })

  if (existingConfig === 0) {
    console.log('Bootstrapping tenant configuration...')
    await bootstrapTenantConfig(tenant.id)
    console.log('✅ Tenant configuration bootstrapped')
  } else {
    console.log('✅ Tenant configuration already exists')
  }

  console.log('🎉 Seed completed successfully!')
  console.log('📧 Admin login: admin@local.dev')
  console.log('🔑 Admin password: admin123')
  console.log('🏢 Tenant slug: local-dev')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })