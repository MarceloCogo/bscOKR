import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserPermissions } from '@/lib/domain/permissions'
import { StrategyBuilding } from '@/components/strategy/strategy-building'

export default async function StrategyBuildingPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
  if (!permissions.canViewStrategyMap) {
    redirect('/app/dashboard')
  }

  return <StrategyBuilding />
}
