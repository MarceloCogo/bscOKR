'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, UserPlus, Edit, Trash2, Save, Copy } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  createdAt: string
  mustChangePassword: boolean
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

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    roleId: '',
  })

  const defaultRoleId = useMemo(() => roles.find((r) => r.key === 'member')?.id || roles[0]?.id || '', [roles])

  const loadData = async () => {
    try {
      const [usersRes, rolesRes, sessionRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/config/roles'),
        fetch('/api/auth/session'),
      ])

      if (usersRes.ok) setUsers(await usersRes.json())
      if (rolesRes.ok) setRoles(await rolesRes.json())
      if (sessionRes.ok) {
        const session = await sessionRes.json()
        setCurrentUserId(session.user?.id || '')
      }
    } catch (error) {
      console.error('Error loading users data:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      roleId: defaultRoleId,
    })
  }

  const openCreateDialog = () => {
    setFormData({
      name: '',
      email: '',
      roleId: defaultRoleId,
    })
    setCreateOpen(true)
  }

  const openEditDialog = (user: User) => {
    setEditUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      roleId: user.userRoles[0]?.role.id || defaultRoleId,
    })
  }

  const handleCreateUser = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.roleId) {
      toast.error('Preencha nome, email e grupo de acesso')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          roleId: formData.roleId,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error?.formErrors?.[0] || data.error || 'Erro ao criar usuário')
      }

      setCreateOpen(false)
      setTempPassword(data.temporaryPassword)
      toast.success('Usuário criado com sucesso')
      await loadData()
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleEditUser = async () => {
    if (!editUser) return
    if (!formData.name.trim() || !formData.email.trim() || !formData.roleId) {
      toast.error('Preencha nome, email e grupo de acesso')
      return
    }

    setSaving(true)
    try {
      const [updateUserRes, updateRolesRes] = await Promise.all([
        fetch(`/api/admin/users/${editUser.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
          }),
        }),
        fetch(`/api/admin/users/${editUser.id}/roles`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roleIds: [formData.roleId] }),
        }),
      ])

      if (!updateUserRes.ok) {
        const data = await updateUserRes.json().catch(() => ({}))
        throw new Error(data.error?.formErrors?.[0] || data.error || 'Erro ao editar usuário')
      }

      if (!updateRolesRes.ok) {
        const data = await updateRolesRes.json().catch(() => ({}))
        throw new Error(data.error?.formErrors?.[0] || data.error || 'Erro ao atualizar grupo de acesso')
      }

      toast.success('Usuário atualizado com sucesso')
      setEditUser(null)
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao editar usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deleteUser) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/users/${deleteUser.id}`, {
        method: 'DELETE',
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao remover usuário')
      }

      toast.success('Usuário removido com sucesso')
      setDeleteUser(null)
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao remover usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyTemporaryPassword = async () => {
    if (!tempPassword) return
    await navigator.clipboard.writeText(tempPassword)
    toast.success('Senha temporária copiada')
  }

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Usuários</h1>
          <p className="mt-2 text-muted-foreground">Cadastre usuários e configure grupos de acesso.</p>
        </div>
        <Button onClick={openCreateDialog}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="grid gap-6">
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{user.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                    <Edit className="mr-1 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteUser(user)}
                    disabled={user.id === currentUserId}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Remover
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {user.userRoles.length > 0 ? (
                    user.userRoles.map((userRole) => (
                      <span key={userRole.role.id} className="rounded-md bg-primary/10 px-2 py-1 text-xs text-primary">
                        {userRole.role.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhum grupo atribuído</span>
                  )}
                </div>
                {user.mustChangePassword && (
                  <p className="text-xs font-medium text-amber-700">Pendente: troca de senha no primeiro acesso</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Criado em: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}

        {users.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Nenhum usuário encontrado</h3>
              <p className="mb-4 text-muted-foreground">Comece criando o primeiro usuário do sistema.</p>
              <Button onClick={openCreateDialog}>
                <UserPlus className="mr-2 h-4 w-4" />
                Criar Primeiro Usuário
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Nome</label>
              <Input value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Email</label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Grupo de acesso</label>
              <Select value={formData.roleId} onValueChange={(value) => setFormData((prev) => ({ ...prev, roleId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar grupo" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={saving}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? 'Salvando...' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">Nome</label>
              <Input value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Email</label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Grupo de acesso</label>
              <Select value={formData.roleId} onValueChange={(value) => setFormData((prev) => ({ ...prev, roleId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar grupo" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleEditUser} disabled={saving}>
              <Save className="mr-1 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover <span className="font-medium text-foreground">{deleteUser?.name}</span>? Essa ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={saving}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={saving}>
              {saving ? 'Removendo...' : 'Remover usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tempPassword} onOpenChange={(open) => !open && setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha temporária gerada</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Copie e envie essa senha para o usuário. Ela é exibida apenas uma vez.
          </p>
          <div className="rounded-md border bg-muted/40 p-3 font-mono text-sm">{tempPassword}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTempPassword(null)}>Fechar</Button>
            <Button onClick={handleCopyTemporaryPassword}>
              <Copy className="mr-1 h-4 w-4" />
              Copiar senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
