import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getOrgTree, getUserOrgContext } from '@/lib/actions/org'
import { OrgTree } from '@/components/org/org-tree'
import { OrgNodePanel } from '@/components/org/org-node-panel'
import { OrgOnboardingWizard } from '@/components/org/org-onboarding'

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const isOnboarding = searchParams.onboarding === 'true'

  if (isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <OrgOnboardingWizard />
      </div>
    )
  }

  const [orgTree, userContext] = await Promise.all([
    getOrgTree(),
    getUserOrgContext(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Estrutura Organizacional</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie a estrutura hierárquica da organização: {session.user.tenantName}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Árvore Organizacional</h2>
          <OrgTree tree={orgTree} userContext={userContext} />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Detalhes do Nó</h2>
          <OrgNodePanel />
        </div>
      </div>
    </div>
  )
}