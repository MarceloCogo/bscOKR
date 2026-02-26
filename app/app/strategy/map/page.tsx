import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { listObjectives } from '@/lib/actions/strategy'
import { listPerspectives } from '@/lib/actions/config/perspective'
import { StrategyMap } from '@/components/strategy/strategy-map'

export default async function StrategyMapPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const [objectives, perspectives] = await Promise.all([
    listObjectives(),
    listPerspectives(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Mapa Estratégico</h1>
        <p className="text-muted-foreground mt-2">
          Visualize os objetivos estratégicos organizados por perspectivas: {session.user.tenantName}
        </p>
      </div>

      <StrategyMap objectives={objectives} perspectives={perspectives} />
    </div>
  )
}