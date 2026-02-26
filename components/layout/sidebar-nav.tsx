'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BarChart3, Settings, Users, Target, Home } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: Home },
  { name: 'Objetivos', href: '/app/objectives', icon: Target },
  { name: 'Administração', href: '/app/admin/config', icon: Settings },
  { name: 'Usuários', href: '/app/admin/users', icon: Users },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r border-border">
      <div className="flex h-16 items-center border-b border-border px-6">
        <h1 className="text-xl font-bold text-primary">BSC OKR</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'nav-item flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                isActive ? 'nav-item-active' : 'nav-item-inactive'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}