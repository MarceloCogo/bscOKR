'use client'

import { useEffect, useMemo, useState } from 'react'
import { Trash2, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface OrgNode {
  id: string
  name: string
  type: { name: string }
  leader?: { id: string; name: string }
  memberships: Array<{ user: { id: string; name: string } }>
  children: OrgNode[]
}

interface Grant {
  id: string
  granteeType: 'ROLE' | 'USER'
  granteeId: string
  granteeName?: string | null
  permission: 'VIEW' | 'EDIT'
  includeDescendants: boolean
  createdAt: string
}

interface SelectOption {
  id: string
  name: string
}

interface OrgNodePanelProps {
  selectedNode: OrgNode | null
  canManageGrants: boolean
}

export function OrgNodePanel({ selectedNode, canManageGrants }: OrgNodePanelProps) {
  const [grants, setGrants] = useState<Grant[]>([])
  const [users, setUsers] = useState<SelectOption[]>([])
  const [roles, setRoles] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [isSavingGrant, setIsSavingGrant] = useState(false)
  const [grantToDelete, setGrantToDelete] = useState<Grant | null>(null)
  const [granteeType, setGranteeType] = useState<'USER' | 'ROLE'>('ROLE')
  const [granteeId, setGranteeId] = useState('')
  const [permission, setPermission] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [includeDescendants, setIncludeDescendants] = useState(false)

  const granteeOptions = useMemo(() => {
    return granteeType === 'ROLE' ? roles : users
  }, [granteeType, roles, users])

  const resetGrantForm = () => {
    setGranteeType('ROLE')
    setGranteeId('')
    setPermission('VIEW')
    setIncludeDescendants(false)
  }

  const loadPanelData = async (orgNodeId: string) => {
    setLoading(true)
    try {
      const requests: Promise<Response>[] = [fetch(`/api/org/grants?orgNodeId=${orgNodeId}`)]

      if (canManageGrants) {
        requests.push(fetch('/api/users'))
        requests.push(fetch('/api/config/roles'))
      }

      const responses = await Promise.all(requests)
      const [grantsRes, usersRes, rolesRes] = responses

      if (grantsRes?.ok) {
        const payload = await grantsRes.json()
        setGrants(payload.grants || [])
      } else {
        setGrants([])
      }

      if (canManageGrants && usersRes?.ok) {
        const userPayload = await usersRes.json()
        setUsers((userPayload || []).map((user: any) => ({ id: user.id, name: user.name || user.email })))
      } else {
        setUsers([])
      }

      if (canManageGrants && rolesRes?.ok) {
        const rolePayload = await rolesRes.json()
        setRoles((rolePayload || []).map((role: any) => ({ id: role.id, name: role.name })))
      } else {
        setRoles([])
      }
    } catch (error) {
      console.error('Error loading node panel data:', error)
      toast.error('Erro ao carregar dados de acesso compartilhado')
      setGrants([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    resetGrantForm()
    if (!selectedNode) {
      setGrants([])
      return
    }
    void loadPanelData(selectedNode.id)
  }, [selectedNode?.id, canManageGrants])

  const handleCreateGrant = async () => {
    if (!selectedNode || !granteeId) return

    setIsSavingGrant(true)
    try {
      const response = await fetch('/api/org/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgNodeId: selectedNode.id,
          granteeType,
          granteeId,
          permission,
          includeDescendants,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Falha ao criar compartilhamento')
      }

      toast.success('Compartilhamento salvo com sucesso')
      resetGrantForm()
      await loadPanelData(selectedNode.id)
    } catch (error) {
      console.error('Error creating grant:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar compartilhamento')
    } finally {
      setIsSavingGrant(false)
    }
  }

  const handleDeleteGrant = async () => {
    if (!selectedNode || !grantToDelete) return

    try {
      const response = await fetch(`/api/org/grants?id=${grantToDelete.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Falha ao remover compartilhamento')
      }

      toast.success('Compartilhamento removido')
      setGrantToDelete(null)
      await loadPanelData(selectedNode.id)
    } catch (error) {
      console.error('Error deleting grant:', error)
      toast.error('Erro ao remover compartilhamento')
    }
  }

  if (!selectedNode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Selecione um nó</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Clique em um nó na árvore à esquerda para ver detalhes e configurar acessos compartilhados.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{selectedNode.name}</span>
            <Badge variant="outline">{selectedNode.type.name}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Líder: {selectedNode.leader?.name || 'Não definido'}
          </p>
          <p className="text-muted-foreground">
            Membros: {selectedNode.memberships.length > 0 ? selectedNode.memberships.map((item) => item.user.name).join(', ') : 'Sem membros'}
          </p>
          <p className="text-muted-foreground">Filhos: {selectedNode.children.length}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Acessos compartilhados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando compartilhamentos...
            </div>
          ) : grants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum compartilhamento configurado para este nó.</p>
          ) : (
            <div className="space-y-2">
              {grants.map((grant) => (
                <div key={grant.id} className="flex items-center justify-between rounded-md border border-neutral-200 p-2">
                  <div className="text-sm">
                    <div className="font-medium">
                      {grant.granteeType === 'ROLE' ? 'Papel' : 'Usuário'}: {grant.granteeName || grant.granteeId}
                    </div>
                    <div className="text-muted-foreground">
                      {grant.permission === 'EDIT' ? 'Editar' : 'Visualizar'}
                      {grant.includeDescendants ? ' (inclui descendentes)' : ''}
                    </div>
                  </div>
                  {canManageGrants && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setGrantToDelete(grant)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {canManageGrants ? (
            <div className="space-y-3 rounded-md border border-dashed border-neutral-300 p-3">
              <h4 className="text-sm font-medium">Adicionar acesso compartilhado</h4>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Tipo do favorecido</Label>
                  <Select value={granteeType} onValueChange={(value: 'USER' | 'ROLE') => { setGranteeType(value); setGranteeId('') }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ROLE">Papel</SelectItem>
                      <SelectItem value="USER">Usuário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>{granteeType === 'ROLE' ? 'Papel' : 'Usuário'}</Label>
                  <Select value={granteeId} onValueChange={setGranteeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {granteeOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Permissão</Label>
                  <Select value={permission} onValueChange={(value: 'VIEW' | 'EDIT') => setPermission(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEW">Visualizar (VIEW)</SelectItem>
                      <SelectItem value="EDIT">Editar (EDIT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Abrangência</Label>
                  <button
                    type="button"
                    onClick={() => setIncludeDescendants((prev) => !prev)}
                    className={`h-10 w-full rounded-md border px-3 text-left text-sm transition-colors ${includeDescendants ? 'border-[#E87722] bg-orange-50 text-orange-900' : 'border-input bg-background'}`}
                  >
                    {includeDescendants ? 'Este nó + descendentes' : 'Somente este nó'}
                  </button>
                </div>
              </div>

              <Button onClick={handleCreateGrant} disabled={!granteeId || isSavingGrant}>
                {isSavingGrant ? 'Salvando...' : 'Salvar compartilhamento'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Você não possui permissão para gerenciar compartilhamentos.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(grantToDelete)} onOpenChange={(open) => !open && setGrantToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover compartilhamento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover este acesso compartilhado? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteGrant}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
