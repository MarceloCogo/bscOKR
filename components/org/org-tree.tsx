'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Edit, Trash2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface OrgNode {
  id: string
  name: string
  type: { name: string }
  leader?: { id: string; name: string }
  memberships: Array<{ user: { id: string; name: string } }>
  children: OrgNode[]
}

interface OrgTreeProps {
  tree: OrgNode[]
  userContext: {
    activeOrgNodeId?: string | null
    memberships: any[]
    primaryOrgNode?: any
  }
}

export function OrgTree({ tree, userContext }: OrgTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [parentNodeId, setParentNodeId] = useState<string>('')
  const [editingNodeId, setEditingNodeId] = useState<string>('')
  const [editingNodeName, setEditingNodeName] = useState('')
  const [childForm, setChildForm] = useState({ name: '', type: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const handleCreateChild = (parentId: string) => {
    setParentNodeId(parentId)
    setChildForm({ name: '', type: '' })
    setShowCreateDialog(true)
  }

  const handleCreateChildSubmit = async () => {
    if (!childForm.name.trim() || !childForm.type) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/org/create-child', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentId: parentNodeId,
          name: childForm.name.trim(),
          type: childForm.type,
        }),
      })

      if (response.ok) {
        setShowCreateDialog(false)
        router.refresh()
        toast.success('Unidade filha criada com sucesso!')
      } else {
        toast.error('Erro ao criar unidade filha')
      }
    } catch (error) {
      console.error('Error creating child:', error)
      toast.error('Erro ao criar unidade filha')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditNode = (nodeId: string, nodeName: string) => {
    setEditingNodeId(nodeId)
    setEditingNodeName(nodeName)
    setShowEditDialog(true)
  }

  const handleEditNodeSubmit = async () => {
    if (!editingNodeId || !editingNodeName.trim()) return

    setIsEditing(true)
    try {
      const response = await fetch(`/api/org/${editingNodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingNodeName.trim() }),
      })

      if (response.ok) {
        setShowEditDialog(false)
        setEditingNodeId('')
        setEditingNodeName('')
        router.refresh()
        toast.success('Unidade atualizada com sucesso!')
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || 'Erro ao atualizar unidade')
      }
    } catch (error) {
      console.error('Error editing node:', error)
      toast.error('Erro ao atualizar unidade')
    } finally {
      setIsEditing(false)
    }
  }

  const handleSetActiveContext = async (nodeId: string) => {
    try {
      await fetch('/api/org/set-active-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgNodeId: nodeId }),
      })
      router.refresh()
      window.dispatchEvent(new Event('org-context-changed'))
    } catch (error) {
      console.error('Error setting active context:', error)
    }
  }

  const handleCreateRootNode = () => {
    // Redirect to onboarding wizard
    router.push('/app/organization?onboarding=true')
  }

  const TreeNode = ({ node, level = 0 }: { node: OrgNode; level?: number }) => {
    const isExpanded = expandedNodes.has(node.id)
    const isActive = userContext.activeOrgNodeId === node.id
    const isPrimary = userContext.primaryOrgNode?.id === node.id
    const hasChildren = node.children.length > 0

    return (
      <div>
        <Card className={`mb-2 ${isActive ? 'ring-2 ring-primary' : ''} ${isPrimary ? 'border-primary' : ''}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(node.id)}
                    className="p-1 h-6 w-6"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                )}
                {!hasChildren && <div className="w-6" />}
                <div>
                  <div className="font-medium">{node.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {node.type.name}
                    {node.leader && ` • Líder: ${node.leader.name}`}
                    {isPrimary && ' (Primário)'}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateChild(node.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar filho
                </Button>
                {!isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetActiveContext(node.id)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Ativar contexto de trabalho
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditNode(node.id, node.name)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" className="text-destructive border-destructive">
                  <Trash2 className="h-3 w-3 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
            {node.memberships.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                Membros: {node.memberships.map(m => m.user.name).join(', ')}
              </div>
            )}
          </CardContent>
        </Card>
        {isExpanded && hasChildren && (
          <div className="ml-6">
            {node.children.map(child => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            <div>
              <p className="text-muted-foreground mb-4">
                Nenhum nó organizacional encontrado. Comece criando um nó raiz.
              </p>
              <Button onClick={handleCreateRootNode}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Nó Raiz
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {tree.map(node => (
        <TreeNode key={node.id} node={node} />
      ))}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Unidade Filha</DialogTitle>
            <DialogDescription>
              Adicione uma nova unidade abaixo da unidade selecionada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="childName">Nome da Unidade</Label>
              <Input
                id="childName"
                value={childForm.name}
                onChange={(e) => setChildForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Digite o nome da unidade"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="childType">Tipo de Unidade</Label>
              <Select value={childForm.type} onValueChange={(value) => setChildForm(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Empresa</SelectItem>
                  <SelectItem value="directorate">Diretoria</SelectItem>
                  <SelectItem value="management">Gerência</SelectItem>
                  <SelectItem value="coordination">Coordenação</SelectItem>
                  <SelectItem value="team">Equipe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateChildSubmit}
              disabled={!childForm.name.trim() || !childForm.type || isCreating}
            >
              {isCreating ? 'Criando...' : 'Criar Unidade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Unidade</DialogTitle>
            <DialogDescription>
              Atualize o nome da unidade organizacional selecionada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editNodeName">Nome da Unidade</Label>
              <Input
                id="editNodeName"
                value={editingNodeName}
                onChange={(e) => setEditingNodeName(e.target.value)}
                placeholder="Digite o nome da unidade"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditNodeSubmit} disabled={!editingNodeName.trim() || isEditing}>
              {isEditing ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
