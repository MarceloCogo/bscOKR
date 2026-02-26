import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { listObjectives } from '@/lib/actions/strategy'
import { listPerspectives } from '@/lib/actions/config/perspective'
import { getUserOrgContext } from '@/lib/actions/org'
import { StrategyMap } from '@/components/strategy/strategy-map'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function StrategyMapPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const [objectives, perspectives, userContext] = await Promise.all([
    listObjectives(),
    listPerspectives(),
    getUserOrgContext(),
  ])

  const hasActiveOrgNode = !!userContext.activeOrgNodeId

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mapa Estratégico</h1>
        <p className="text-muted-foreground mt-2">
          Visualize os objetivos estratégicos organizados por perspectivas: {session.user.tenantName}
        </p>
      </div>

      {!hasActiveOrgNode && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Contexto Organizacional Não Selecionado</h3>
              <p className="text-muted-foreground mb-4">
                Para visualizar o mapa estratégico, selecione um contexto organizacional ativo.
              </p>
              <Button asChild>
                <Link href="/app/organization">Ir para Estrutura Organizacional</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <StrategyMap
        objectives={objectives}
        perspectives={perspectives}
        activeOrgNodeId={userContext.activeOrgNodeId}
      />
    </div>
  )
}