import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { AppShell } from '@/components/layout/app-shell'
import { getUserOrgContext } from '@/lib/actions/org'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const orgContext = await getUserOrgContext()
  if (!orgContext.activeOrgNodeId) {
    redirect('/login?message=Sem acesso ao contexto organizacional')
  }

  return <AppShell session={session}>{children}</AppShell>
}
