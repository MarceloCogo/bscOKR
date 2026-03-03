import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getOrgTree, getUserOrgContext } from '@/lib/actions/org'
import { getUserPermissions } from '@/lib/domain/permissions'
import { OrganizationWorkspace } from '@/components/org/organization-workspace'
import { OrgOnboardingWizard } from '@/components/org/org-onboarding'

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const searchParamsResolved = await searchParams
  const isOnboarding = searchParamsResolved.onboarding === 'true'

  if (isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <OrgOnboardingWizard />
      </div>
    )
  }

  const [orgTree, userContext, permissions] = await Promise.all([
    getOrgTree(),
    getUserOrgContext(),
    getUserPermissions(session.user.id, session.user.tenantId),
  ])

  // If no org nodes, show onboarding wizard automatically
  if (orgTree.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <OrgOnboardingWizard />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Estrutura Organizacional</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie a estrutura hierárquica da organização: {session.user.tenantName}
        </p>
      </div>

      <OrganizationWorkspace
        tree={orgTree}
        userContext={userContext}
        canManageGrants={Boolean(permissions.canManageUsers || permissions.canManageConfig)}
        canManageStructure={Boolean(permissions.canManageConfig)}
      />
    </div>
  )
}
