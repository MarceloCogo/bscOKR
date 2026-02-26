import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StatCard } from '@/components/layout/stat-card'
import { Button } from '@/components/ui/button'
import { Target, TrendingUp, Calendar, Users, Map, Network } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Get real data
  const [
    orgNodesCount,
    objectivesCount,
    activeObjectivesCount,
    usersCount,
    recentObjectives,
    recentOrgNodes,
  ] = await Promise.all([
    prisma.orgNode.count({ where: { tenantId: session.user.tenantId } }),
    prisma.strategicObjective.count({ where: { tenantId: session.user.tenantId } }),
    prisma.strategicObjective.count({
      where: {
        tenantId: session.user.tenantId,
        status: { key: 'active' }
      }
    }),
    prisma.user.count({ where: { tenantId: session.user.tenantId } }),
    // Recent objectives
    prisma.strategicObjective.findMany({
      where: { tenantId: session.user.tenantId },
      include: { status: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    // Recent org nodes
    prisma.orgNode.findMany({
      where: { tenantId: session.user.tenantId },
      include: { type: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
  ])

  const hasOrgStructure = orgNodesCount > 0
  const hasObjectives = objectivesCount > 0
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Bem-vindo ao sistema BSC OKR
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Objetivos Ativos"
          value={activeObjectivesCount.toString()}
          description="Objetivos em andamento"
          icon={Target}
          trend={{ value: 0, label: "vs. mês anterior" }}
        />

        <StatCard
          title="Total de Objetivos"
          value={objectivesCount.toString()}
          description="Objetivos estratégicos"
          icon={TrendingUp}
          trend={{ value: 0, label: "vs. mês anterior" }}
        />

        <StatCard
          title="Estrutura Org."
          value={orgNodesCount.toString()}
          description="Unidades organizacionais"
          icon={Network}
          trend={{ value: 0, label: "vs. mês anterior" }}
        />

        <StatCard
          title="Usuários Ativos"
          value={usersCount.toString()}
          description="Usuários no sistema"
          icon={Users}
          trend={{ value: 100, label: "vs. mês anterior" }}
        />
      </div>

      {!hasOrgStructure && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">🚀 Comece estruturando sua organização</h3>
          <p className="text-blue-700 mb-4">
            Antes de criar objetivos estratégicos, defina a estrutura organizacional da sua empresa.
          </p>
          <Link href="/app/organization">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Network className="h-4 w-4 mr-2" />
              Configurar Estrutura Organizacional
            </Button>
          </Link>
        </div>
      )}

      {hasOrgStructure && !hasObjectives && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">🎯 Pronto para criar objetivos estratégicos</h3>
          <p className="text-green-700 mb-4">
            Sua estrutura organizacional está configurada. Agora defina os objetivos que guiarão sua estratégia.
          </p>
          <Link href="/app/strategy/map">
            <Button className="bg-green-600 hover:bg-green-700">
              <Map className="h-4 w-4 mr-2" />
              Criar Primeiro Objetivo
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href={hasOrgStructure ? "/app/strategy/map" : "/app/organization"}>
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
            <Map className="h-6 w-6" />
            <span>Mapa Estratégico</span>
          </Button>
        </Link>

        <Link href={hasOrgStructure ? "/app/strategy/objectives" : "/app/organization"}>
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
            <Target className="h-6 w-6" />
            <span>Objetivos</span>
          </Button>
        </Link>

        <Link href="/app/organization">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
            <Network className="h-6 w-6" />
            <span>Organização</span>
          </Button>
        </Link>

        <Link href="/app/admin/config">
          <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
            <Users className="h-6 w-6" />
            <span>Admin</span>
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="stat-card">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Atividades Recentes
            </h3>
            <div className="space-y-3">
              {recentObjectives.map((objective) => (
                <div key={`obj-${objective.id}`} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Objetivo criado: {objective.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Status: {objective.status?.name} • {objective.createdAt.toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}

              {recentOrgNodes.map((orgNode) => (
                <div key={`org-${orgNode.id}`} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Unidade criada: {orgNode.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tipo: {orgNode.type?.name} • {orgNode.createdAt.toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}

              {recentObjectives.length === 0 && recentOrgNodes.length === 0 && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">
                      Bem-vindo ao BSC OKR
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Comece configurando sua estrutura organizacional
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Status do Sistema
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Configurações</span>
                <span className="text-sm font-medium text-green-600">Completo</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Banco de Dados</span>
                <span className="text-sm font-medium text-green-600">Conectado</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Usuários</span>
                <span className="text-sm font-medium text-blue-600">1 Admin</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Objetivos</span>
                <span className={`text-sm font-medium ${objectivesCount > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {objectivesCount > 0 ? `${objectivesCount} criados` : 'Aguardando'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}