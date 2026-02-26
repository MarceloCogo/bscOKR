'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, UserPlus, Edit, Trash2, Save } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  createdAt: string
  userRoles: Array<{
    role: {
      id: string
      name: string
      key: string
    }
  }>
}

interface Role {
  id: string
  name: string
  key: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, rolesRes, sessionRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/config/roles'),
          fetch('/api/auth/session')
        ])

        if (usersRes.ok) setUsers(await usersRes.json())
        if (rolesRes.ok) setRoles(await rolesRes.json())
        if (sessionRes.ok) {
          const session = await sessionRes.json()
          setCurrentUserId(session.user?.id || '')
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie os usuários e suas funções
          </p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid gap-6">
        {users.map((user) => (
          <UserRoleManager
            key={user.id}
            user={user}
            roles={roles}
            currentUserId={currentUserId}
          />
        ))}

        {users.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando o primeiro usuário do sistema.
              </p>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Criar Primeiro Usuário
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function UserRoleManager({ user, roles, currentUserId }: {
  user: User,
  roles: Role[],
  currentUserId: string
}) {
  const [selectedRoleId, setSelectedRoleId] = useState(user.userRoles[0]?.role.id || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveRole = async () => {
    if (!selectedRoleId) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/users/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          roleId: selectedRoleId,
        }),
      })

      if (response.ok) {
        toast.success('Função atualizada com sucesso!')
        window.location.reload()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao atualizar função')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Erro ao atualizar função')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{user.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1" />
              Remover
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Função:</span>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecionar função" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleSaveRole} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>

          {user.userRoles.length > 0 ? (
            <div className="flex gap-1">
              {user.userRoles.map((userRole) => (
                <span
                  key={userRole.role.id}
                  className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                >
                  {userRole.role.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">Nenhuma função atribuída</span>
          )}

          <div className="text-xs text-muted-foreground">
            Criado em: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}