'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
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
import { Eye, Edit, Trash2 } from 'lucide-react'
import { deleteObjective } from '@/lib/actions/strategy'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ObjectiveDrawer } from './objective-drawer'
import { toast } from 'sonner'

interface StrategicObjective {
  id: string
  title: string
  perspective: { id: string; name: string }
  pillar?: { name: string } | null
  status: { id: string; name: string; color?: string | null }
  sponsor: { id: string; name: string }
  weight: number
  orgNode: { name: string; type: { name: string } }
}

interface Perspective {
  id: string
  name: string
}

interface Pillar {
  id: string
  name: string
}

interface ObjectiveStatus {
  id: string
  name: string
}

interface OrgNode {
  id: string
  name: string
  type: { name: string }
}

interface User {
  id: string
  name: string
  email: string
}

interface ResponsibilityRole {
  id: string
  name: string
}

interface ObjectiveResponsibility {
  id: string
  entityType: string
  entityId: string
  responsibilityRole: ResponsibilityRole
  contributionWeight: number
}



interface ObjectivesListProps {
  objectives: StrategicObjective[]
  perspectives: Perspective[]
  pillars: Pillar[]
  statuses: ObjectiveStatus[]
  orgNodes: OrgNode[]
  users: User[]
  roles: ResponsibilityRole[]
}

export function ObjectivesList({
  objectives,
  perspectives,
  pillars,
  statuses,
  orgNodes,
  users,
  roles,
}: ObjectivesListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedObjective, setSelectedObjective] = useState<any>(null)
  const [pendingDeleteObjectiveId, setPendingDeleteObjectiveId] = useState<string | null>(null)
  const [perspectiveFilter, setPerspectiveFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sponsorFilter, setSponsorFilter] = useState('all')
  const [isContextLoading, setIsContextLoading] = useState(false)

  useEffect(() => {
    const handleContextChanging = () => {
      setIsContextLoading(true)
    }

    const handleContextChangeEnded = () => {
      setTimeout(() => setIsContextLoading(false), 350)
    }

    window.addEventListener('org-context-changing', handleContextChanging)
    window.addEventListener('org-context-changed', handleContextChangeEnded)
    window.addEventListener('org-context-change-ended', handleContextChangeEnded)

    return () => {
      window.removeEventListener('org-context-changing', handleContextChanging)
      window.removeEventListener('org-context-changed', handleContextChangeEnded)
      window.removeEventListener('org-context-change-ended', handleContextChangeEnded)
    }
  }, [])

  const filteredObjectives = useMemo(() => {
    return objectives.filter((objective) => {
      const matchesPerspective = perspectiveFilter === 'all' || objective.perspective.id === perspectiveFilter
      const matchesStatus = statusFilter === 'all' || objective.status.id === statusFilter
      const matchesSponsor = sponsorFilter === 'all' || objective.sponsor.id === sponsorFilter
      return matchesPerspective && matchesStatus && matchesSponsor
    })
  }, [objectives, perspectiveFilter, statusFilter, sponsorFilter])

  const handleView = (id: string) => {
    const objective = objectives.find(o => o.id === id)
    if (objective) {
      setSelectedObjective(objective)
      setDrawerOpen(true)
    }
  }

  const handleEdit = (id: string) => {
    handleView(id)
  }

  const handleDelete = async (id: string) => {
    setLoading(id)
    try {
      await deleteObjective(id)
      router.refresh()
      toast.success('Objetivo excluído com sucesso')
    } catch (error) {
      console.error('Error deleting objective:', error)
      toast.error('Erro ao excluir objetivo')
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Objetivos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          <Select value={perspectiveFilter} onValueChange={setPerspectiveFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Perspectiva" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as perspectivas</SelectItem>
              {perspectives.map((perspective) => (
                <SelectItem key={perspective.id} value={perspective.id}>
                  {perspective.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sponsorFilter} onValueChange={setSponsorFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Sponsor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os sponsors</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setPerspectiveFilter('all')
              setStatusFilter('all')
              setSponsorFilter('all')
            }}
          >
            Limpar filtros
          </Button>
        </div>

        <div className="relative">
        {isContextLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-white/70 backdrop-blur-sm">
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700 shadow-sm">
              Atualizando objetivos do novo contexto...
            </div>
          </div>
        )}

        {filteredObjectives.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum objetivo encontrado para os filtros selecionados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Perspectiva</TableHead>
                <TableHead>Pilar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Org Node</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredObjectives.map(objective => (
                <TableRow key={objective.id}>
                  <TableCell className="font-medium">{objective.title}</TableCell>
                  <TableCell>{objective.perspective.name}</TableCell>
                  <TableCell>{objective.pillar?.name || '-'}</TableCell>
                  <TableCell>
                    <span
                      className="px-2 py-1 text-xs border rounded"
                      style={{ borderColor: objective.status.color || '#6b7280' }}
                    >
                      {objective.status.name}
                    </span>
                  </TableCell>
                  <TableCell>{objective.sponsor.name}</TableCell>
                  <TableCell>{objective.weight}%</TableCell>
                  <TableCell>{objective.orgNode.name} ({objective.orgNode.type.name})</TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(objective.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(objective.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDeleteObjectiveId(objective.id)}
                        disabled={loading === objective.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        </div>
      </CardContent>

      <ObjectiveDrawer
        objective={selectedObjective}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        perspectives={perspectives}
        pillars={pillars}
        statuses={statuses}
        orgNodes={orgNodes}
        users={users}
        roles={roles}
      />

      <AlertDialog open={!!pendingDeleteObjectiveId} onOpenChange={(open) => !open && setPendingDeleteObjectiveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este objetivo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (pendingDeleteObjectiveId) {
                  handleDelete(pendingDeleteObjectiveId)
                }
                setPendingDeleteObjectiveId(null)
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
