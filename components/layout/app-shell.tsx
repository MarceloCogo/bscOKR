import { Session } from 'next-auth'
import { SidebarNav } from './sidebar-nav'
import { TopBar } from './top-bar'

interface AppShellProps {
  children: React.ReactNode
  session: Session
  title?: string
}

export function AppShell({ children, session, title }: AppShellProps) {
  return (
    <div className="flex h-screen bg-background">
      <SidebarNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar session={session} title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}