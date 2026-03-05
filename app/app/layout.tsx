import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { AppShell } from '@/components/layout/app-shell'
import { getResolvedActiveOrgNodeId } from '@/lib/actions/org'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const activeOrgNodeId = await getResolvedActiveOrgNodeId()
  if (!activeOrgNodeId) {
    redirect('/login?message=Sem acesso ao contexto organizacional')
  }

  return <AppShell session={session}>{children}</AppShell>
}
