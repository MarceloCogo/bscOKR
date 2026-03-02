'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Settings, Users, Target, Home, Map, Network, ChevronLeft, ChevronRight, BarChart3, Calendar, Columns2 } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: Home },
  { name: 'Mapa Estratégico', href: '/app/strategy/map', icon: Map, permission: 'canViewStrategyMap' },
  { name: 'Strategy Building', href: '/app/strategy/building', icon: Columns2, permission: 'canViewStrategyMap' },
  { name: 'Objetivos', href: '/app/strategy/objectives', icon: Target, permission: 'canViewObjectives' },
  { name: 'Key Results', href: '/app/krs', icon: BarChart3, permission: 'canViewKRs' },
  { name: 'Estrutura Organizacional', href: '/app/organization', icon: Network },
  { name: 'Administração', href: '/app/admin/config', icon: Settings, permission: 'canManageConfig' },
  { name: 'Ciclos', href: '/app/admin/cycles', icon: Calendar, permission: 'canManageConfig' },
  { name: 'Usuários', href: '/app/admin/users', icon: Users, permission: 'canManageUsers' },
]

interface SidebarNavProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function SidebarNav({ collapsed = false, onToggle }: SidebarNavProps) {
  const pathname = usePathname()
  const [permissions, setPermissions] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const response = await fetch('/api/user/permissions')
        if (!response.ok) return
        const data = await response.json()
        setPermissions(data.permissions || {})
      } catch (error) {
        console.error('Error loading permissions for sidebar:', error)
      }
    }

    loadPermissions()
  }, [])

  const visibleNavigation = useMemo(() => {
    return navigation.filter((item) => {
      if (!item.permission) return true
      return Boolean(permissions[item.permission])
    })
  }, [permissions])

  return (
    <div className={cn(
      'fixed left-0 top-0 h-full flex flex-col bg-card border-r border-border transition-all duration-300 z-40',
      collapsed ? 'w-16' : 'w-64'
    )}>
      <div className={cn(
        'flex h-14 items-center border-b border-border transition-all duration-300',
        collapsed ? 'justify-center px-2' : 'justify-between px-6'
      )}>
        {!collapsed && (
          <h1 className="text-xl font-bold text-primary">BSC OKR</h1>
        )}
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            title={collapsed ? 'Expandir menu' : 'Colapsar menu'}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {visibleNavigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                isActive 
                  ? 'bg-primary/10 text-primary border-r-2 border-primary' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
