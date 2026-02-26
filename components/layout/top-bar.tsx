'use client'

import { signOut } from 'next-auth/react'
import { Session } from 'next-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogOut, Search, User } from 'lucide-react'

interface TopBarProps {
  session: Session
  title?: string
}

export function TopBar({ session, title = 'Dashboard' }: TopBarProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search placeholder */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-64 pl-9"
          />
        </div>

        {/* User info and logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-foreground">
                {session.user.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {session.user.tenantName}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}