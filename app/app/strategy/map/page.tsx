import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { MapEditor } from '@/components/strategy/map-editor'
import { getUserPermissions } from '@/lib/domain/permissions'

export default async function StrategyMapPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const permissions = await getUserPermissions(session.user.id, session.user.tenantId)
  if (!permissions.canViewStrategyMap) {
    redirect('/app/dashboard')
  }

  return <MapEditor />
}
