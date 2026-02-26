import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { listObjectives } from '@/lib/actions/strategy'
import { listPerspectives } from '@/lib/actions/config/perspective'
import { listPillars } from '@/lib/actions/config/pillar'
import { listObjectiveStatuses } from '@/lib/actions/config/objective-status'
import { listOrgNodes } from '@/lib/actions/org'
import { listResponsibilityRoles } from '@/lib/actions/config/responsibility-role'
import { prisma } from '@/lib/db'
import { ObjectivesList } from '@/components/strategy/objectives-list'
import { CreateObjectiveDialog } from '@/components/strategy/create-objective-dialog'

export default async function ObjectivesPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const [objectives, perspectives, pillars, statuses, orgNodes, users, roles] = await Promise.all([
    listObjectives(),
    listPerspectives(),
    listPillars(),
    listObjectiveStatuses(),
    listOrgNodes(),
    prisma.user.findMany({
      where: { tenantId: session.user.tenantId },
      select: { id: true, name: true, email: true },
    }),
    listResponsibilityRoles(),
  ])

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Objetivos Estratégicos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os objetivos estratégicos da organização: {session.user.tenantName}
          </p>
        </div>
        <CreateObjectiveDialog perspectives={perspectives} pillars={pillars} statuses={statuses} orgNodes={orgNodes} users={users} />
      </div>

      <ObjectivesList
        objectives={objectives}
        perspectives={perspectives}
        pillars={pillars}
        statuses={statuses}
        orgNodes={orgNodes}
        users={users}
        roles={roles}
      />
    </div>
  )
}