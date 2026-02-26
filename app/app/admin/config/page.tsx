import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigTable } from '@/components/config/config-table'
import {
  listPerspectives,
  createPerspective,
  updatePerspective,
  deletePerspective,
} from '@/lib/actions/config/perspective'
import {
  listPillars,
  createPillar,
  updatePillar,
  deletePillar,
} from '@/lib/actions/config/pillar'
import {
  listOrgNodeTypes,
  createOrgNodeType,
  updateOrgNodeType,
  deleteOrgNodeType,
} from '@/lib/actions/config/org-node-type'
import {
  listObjectiveStatuses,
  createObjectiveStatus,
  updateObjectiveStatus,
  deleteObjectiveStatus,
} from '@/lib/actions/config/objective-status'
import {
  listCycleStatuses,
  createCycleStatus,
  updateCycleStatus,
  deleteCycleStatus,
} from '@/lib/actions/config/cycle-status'
import {
  listKRStatuses,
  createKRStatus,
  updateKRStatus,
  deleteKRStatus,
} from '@/lib/actions/config/kr-status'
import {
  listKRMetricTypes,
  createKRMetricType,
  updateKRMetricType,
  deleteKRMetricType,
} from '@/lib/actions/config/kr-metric-type'
import {
  listResponsibilityRoles,
  createResponsibilityRole,
  updateResponsibilityRole,
  deleteResponsibilityRole,
} from '@/lib/actions/config/responsibility-role'
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from '@/lib/actions/config/role'
import {
  listScoreRules,
  createScoreRule,
  updateScoreRule,
  deleteScoreRule,
} from '@/lib/actions/config/score-rule'
import { PerspectiveTab } from '@/components/config/perspective-tab'
import { PillarTab } from '@/components/config/pillar-tab'
import { OrgTypesTab } from '@/components/config/org-types-tab'
import { StatusesTab } from '@/components/config/statuses-tab'
import { RolesTab } from '@/components/config/roles-tab'

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

  // Check if user is admin
  const userRoles = await prisma.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: true },
  })

  const isAdmin = userRoles.some((userRole: any) => userRole.role.key === 'admin')

  if (!isAdmin) {
    redirect('/app/dashboard')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuração do Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as configurações da organização: {session.user.tenantName}
        </p>
      </div>

      <Tabs defaultValue="perspectives" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12 bg-muted p-1 rounded-lg">
          <TabsTrigger
            value="structure"
            className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm font-medium"
          >
            Estrutura
          </TabsTrigger>
          <TabsTrigger
            value="statuses"
            className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm font-medium"
          >
            Status
          </TabsTrigger>
          <TabsTrigger
            value="roles"
            className="rounded-md data-[state=active]:bg-card data-[state=active]:shadow-sm font-medium"
          >
            Funções
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="space-y-6">
          <Tabs defaultValue="perspectives" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-10 bg-muted/50 p-1 rounded-md">
              <TabsTrigger
                value="perspectives"
                className="rounded data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm"
              >
                Perspectivas
              </TabsTrigger>
              <TabsTrigger
                value="pillars"
                className="rounded data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm"
              >
                Pilares
              </TabsTrigger>
              <TabsTrigger
                value="org-types"
                className="rounded data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm"
              >
                Tipos Org.
              </TabsTrigger>
            </TabsList>
            <TabsContent value="perspectives" className="mt-6"><PerspectiveTab /></TabsContent>
            <TabsContent value="pillars" className="mt-6"><PillarTab /></TabsContent>
            <TabsContent value="org-types" className="mt-6"><OrgTypesTab /></TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="statuses" className="space-y-6">
          <StatusesTab />
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}