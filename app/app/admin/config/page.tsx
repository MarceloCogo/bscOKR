import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

async function getConfigCounts(tenantId: string) {
  const [
    rolesCount,
    orgNodeTypesCount,
    perspectivesCount,
    pillarsCount,
    objectiveStatusesCount,
    cycleStatusesCount,
    krStatusesCount,
    krMetricTypesCount,
    responsibilityRolesCount,
    scoreRulesCount,
  ] = await Promise.all([
    prisma.role.count({ where: { tenantId } }),
    prisma.orgNodeType.count({ where: { tenantId } }),
    prisma.perspective.count({ where: { tenantId } }),
    prisma.pillar.count({ where: { tenantId } }),
    prisma.objectiveStatus.count({ where: { tenantId } }),
    prisma.cycleStatus.count({ where: { tenantId } }),
    prisma.kRStatus.count({ where: { tenantId } }),
    prisma.kRMetricType.count({ where: { tenantId } }),
    prisma.responsibilityRole.count({ where: { tenantId } }),
    prisma.scoreRule.count({ where: { tenantId } }),
  ])

  return {
    rolesCount,
    orgNodeTypesCount,
    perspectivesCount,
    pillarsCount,
    objectiveStatusesCount,
    cycleStatusesCount,
    krStatusesCount,
    krMetricTypesCount,
    responsibilityRolesCount,
    scoreRulesCount,
  }
}

export default async function AdminConfigPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const counts = await getConfigCounts(session.user.tenantId)

  const configItems = [
    { name: 'Funções (Roles)', count: counts.rolesCount, description: 'Funções de usuário no sistema' },
    { name: 'Tipos de Nó Organizacional', count: counts.orgNodeTypesCount, description: 'Estrutura organizacional (Empresa, Diretoria, etc.)' },
    { name: 'Perspectivas', count: counts.perspectivesCount, description: 'Perspectivas BSC (Financeira, Cliente, etc.)' },
    { name: 'Pilares', count: counts.pillarsCount, description: 'Pilares estratégicos' },
    { name: 'Status de Objetivos', count: counts.objectiveStatusesCount, description: 'Estados possíveis dos objetivos' },
    { name: 'Status de Ciclos', count: counts.cycleStatusesCount, description: 'Estados dos ciclos OKR' },
    { name: 'Status de KR', count: counts.krStatusesCount, description: 'Estados dos Key Results' },
    { name: 'Tipos de Métrica KR', count: counts.krMetricTypesCount, description: 'Tipos de medição (Número, Percentual, etc.)' },
    { name: 'Funções de Responsabilidade', count: counts.responsibilityRolesCount, description: 'Papéis em objetivos (Responsável, Dono, etc.)' },
    { name: 'Regras de Pontuação', count: counts.scoreRulesCount, description: 'Regras de cálculo de progresso' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuração do Sistema</h1>
        <p className="text-gray-600">
          Visão geral das configurações da organização: {session.user.tenantName}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configItems.map((item) => (
          <Card key={item.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {item.name}
              </CardTitle>
              <div className="text-2xl font-bold">{item.count}</div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                {item.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Técnicas</CardTitle>
          <CardDescription>
            Detalhes da configuração atual do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Tenant ID:</span>
            <span className="text-sm font-mono">{session.user.tenantId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Slug:</span>
            <span className="text-sm font-mono">{session.user.tenantSlug}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Usuário:</span>
            <span className="text-sm">{session.user.email}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}