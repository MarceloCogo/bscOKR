'use client'

import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Session } from 'next-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogOut, Search, User, Target, Map, BarChart3 } from 'lucide-react'
import { OrgContextSelector } from './org-context-selector'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  title: string
  type: 'objective' | 'kpi' | 'map'
  href: string
}

interface TopBarProps {
  session: Session
  title?: string
}

export function TopBar({ session, title = 'Dashboard' }: TopBarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchItems = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data.results || [])
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setIsSearching(false)
      }
    }

    const debounce = setTimeout(searchItems, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const handleResultClick = (result: SearchResult) => {
    router.push(result.href)
    setSearchQuery('')
    setShowResults(false)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'objective': return Target
      case 'kpi': return BarChart3
      case 'map': return Map
      default: return Target
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        <OrgContextSelector />
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar objetivos, KPIs..."
              className="w-56 pl-9 pr-3"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
            />
          </div>
          
          {showResults && searchQuery.length >= 2 && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-gray-500">Buscando...</div>
              ) : searchResults.length > 0 ? (
                <div className="py-1">
                  {searchResults.map((result) => {
                    const Icon = getIcon(result.type)
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                      >
                        <Icon className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{result.title}</p>
                          <p className="text-xs text-gray-500 capitalize">{result.type}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  Nenhum resultado encontrado
                </div>
              )}
            </div>
          )}
        </div>

        {/* User info and logout */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-foreground">
                {session.user.name}
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