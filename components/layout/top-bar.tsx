'use client'

import { useState, useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Session } from 'next-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LogOut, Search, User, Target, Map, BarChart3, ChevronDown, KeyRound } from 'lucide-react'
import { OrgContextSelector } from './org-context-selector'
import { toast } from 'sonner'

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
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }

      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
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

  const resetPasswordForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
  }

  const handleChangePassword = async () => {
    setPasswordError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Preencha todos os campos')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Nova senha deve ter no mínimo 8 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não conferem')
      return
    }

    setIsSavingPassword(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error?.formErrors?.[0] || data.error || 'Erro ao alterar senha')
      }

      toast.success('Senha alterada com sucesso')
      setChangePasswordOpen(false)
      resetPasswordForm()
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Erro ao alterar senha')
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <header className="h-14 border-b border-border bg-card">
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between px-2">
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
              <div className="absolute right-0 top-full z-50 mt-1 max-h-80 w-80 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
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
                          className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-gray-50"
                        >
                          <Icon className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{result.title}</p>
                            <p className="text-xs capitalize text-gray-500">{result.type}</p>
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
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-foreground">
                  {session.user.name}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
                  onClick={() => {
                    setShowUserMenu(false)
                    setChangePasswordOpen(true)
                  }}
                >
                  <KeyRound className="h-4 w-4" />
                  Alterar senha
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={changePasswordOpen} onOpenChange={(open) => {
        setChangePasswordOpen(open)
        if (!open) resetPasswordForm()
      }}>
        <DialogContent className="sm:max-w-md p-0 gap-0">
          <DialogHeader className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <DialogTitle>Alterar senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para sua conta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-6 py-5">
            <div>
              <label className="mb-1 block text-xs font-medium">Senha atual</label>
              <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Nova senha</label>
              <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Confirmar nova senha</label>
              <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
            {passwordError && (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{passwordError}</p>
            )}
          </div>
          <DialogFooter className="border-t border-neutral-200 bg-neutral-50 px-6 py-4">
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)} disabled={isSavingPassword}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={isSavingPassword}>
              {isSavingPassword ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
