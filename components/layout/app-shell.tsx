'use client'

import { useState } from 'react'
import { Session } from 'next-auth'
import { SidebarNav } from './sidebar-nav'
import { TopBar } from './top-bar'

interface AppShellProps {
  children: React.ReactNode
  session: Session
  title?: string
}

export function AppShell({ children, session, title }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div 
        className="flex flex-1 flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '64px' : '256px' }}
      >
        <TopBar session={session} title={title} />
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  )
}