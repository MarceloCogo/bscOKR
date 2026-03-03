'use client'

import { useEffect, useState } from 'react'
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
  const [isContextChanging, setIsContextChanging] = useState(false)

  useEffect(() => {
    const onChanging = () => setIsContextChanging(true)
    const onChanged = () => setTimeout(() => setIsContextChanging(false), 250)
    const onChangeEnded = () => setIsContextChanging(false)

    window.addEventListener('org-context-changing', onChanging)
    window.addEventListener('org-context-changed', onChanged)
    window.addEventListener('org-context-change-ended', onChangeEnded)

    return () => {
      window.removeEventListener('org-context-changing', onChanging)
      window.removeEventListener('org-context-changed', onChanged)
      window.removeEventListener('org-context-change-ended', onChangeEnded)
    }
  }, [])

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const sendPresence = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        await fetch('/api/user/presence', {
          method: 'POST',
          keepalive: true,
        })
      } catch (error) {
        console.error('Error sending presence heartbeat:', error)
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void sendPresence()
      }
    }

    void sendPresence()
    intervalId = setInterval(() => {
      void sendPresence()
    }, 60_000)

    window.addEventListener('focus', handleVisibility)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (intervalId) clearInterval(intervalId)
      window.removeEventListener('focus', handleVisibility)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <SidebarNav collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div 
        className="flex flex-1 flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarCollapsed ? '64px' : '256px' }}
      >
        <TopBar session={session} title={title} />
        {isContextChanging && (
          <div className="h-1 w-full overflow-hidden bg-neutral-200/80">
            <div className="h-full w-1/3 animate-[contextProgress_1s_ease-in-out_infinite] bg-[#E87722]" />
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
