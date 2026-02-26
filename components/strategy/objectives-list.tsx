'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, Edit, Trash2 } from 'lucide-react'
import { deleteObjective } from '@/lib/actions/strategy'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ObjectiveDrawer } from './objective-drawer'

interface StrategicObjective {
  id: string
  title: string
  perspective: { name: string }
  pillar?: { name: string } | null
  status: { name: string; color?: string | null }
  sponsor: { name: string }
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

  const handleView = (id: string) => {
    const objective = objectives.find(o => o.id === id)
    if (objective) {
      setSelectedObjective(objective)
      setDrawerOpen(true)
    }
  }

  const handleEdit = (id: string) => {
    // TODO: Open drawer for edit
    alert('Editar objetivo: ' + id)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este objetivo?')) return

    setLoading(id)
    try {
      await deleteObjective(id)
      router.refresh()
    } catch (error) {
      console.error('Error deleting objective:', error)
      alert('Erro ao excluir objetivo')
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
        {objectives.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum objetivo encontrado. Crie o primeiro objetivo usando o botão acima.
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
              {objectives.map(objective => (
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
                        onClick={() => handleDelete(objective.id)}
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
    </Card>
  )
}