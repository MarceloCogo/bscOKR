import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

async function getTenants() {
  return await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export default async function AdminTenantsPage() {
  // Only allow in development
  if (process.env.APP_ENV !== 'development') {
    redirect('/app/dashboard')
  }

  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const tenants = await getTenants()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administração - Tenants</h1>
        <p className="text-gray-600">
          Lista de todas as organizações no sistema (apenas desenvolvimento)
        </p>
      </div>

      <div className="grid gap-4">
        {tenants.map((tenant: any) => (
          <Card key={tenant.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{tenant.name}</span>
                <span className="text-sm font-normal text-gray-500">
                  {tenant._count.users} usuário{tenant._count.users !== 1 ? 's' : ''}
                </span>
              </CardTitle>
              <CardDescription>
                Slug: {tenant.slug}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                Criado em: {tenant.createdAt.toLocaleDateString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tenants.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p className="text-gray-500">Nenhum tenant encontrado</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}