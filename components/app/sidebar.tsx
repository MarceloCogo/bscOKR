'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { BarChart3, Settings, Users, Target, Map, Network } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/app/dashboard', icon: BarChart3 },
  { name: 'Mapa Estratégico', href: '/app/strategy/map', icon: Map },
  { name: 'Objetivos', href: '/app/strategy/objectives', icon: Target },
  { name: 'Estrutura Organizacional', href: '/app/organization', icon: Network },
  { name: 'Configurações', href: '/app/admin/config', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [activeContext, setActiveContext] = useState<{
    name: string;
    type: string;
  } | null>(null)

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const response = await fetch('/api/user/context')
        if (response.ok) {
          const data = await response.json()
          setActiveContext(data.activeContext)
        }
      } catch (error) {
        console.error('Error fetching context:', error)
      }
    }

    fetchContext()
  }, [])

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold text-gray-900">BSC OKR</h1>
          </div>
          {activeContext ? (
            <div className="mt-4 px-4 py-2 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Contexto Ativo</p>
              <p className="text-sm font-medium text-blue-900">{activeContext.name}</p>
              <p className="text-xs text-blue-700">{activeContext.type}</p>
              <button className="text-xs text-blue-600 hover:text-blue-800 underline mt-1">
                Clique para trocar
              </button>
            </div>
          ) : (
            <div className="mt-4 px-4 py-2 bg-orange-50 rounded-md border border-orange-200">
              <p className="text-xs text-orange-600 font-medium">Atenção</p>
              <p className="text-sm text-orange-800">Nenhum contexto selecionado</p>
              <p className="text-xs text-orange-700">Configure na estrutura organizacional</p>
            </div>
          )}
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 flex-shrink-0 h-5 w-5',
                      isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}