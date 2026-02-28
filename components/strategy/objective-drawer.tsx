'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateObjectivePartial } from '@/lib/actions/strategy'
import { KeyResultsTab } from './key-results-tab'
import { useRouter } from 'next/navigation'

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

interface StrategicObjective {
  id: string
  title: string
  description?: string
  perspective: Perspective
  pillar?: Pillar | null
  status: ObjectiveStatus
  weight: number
  sponsor: User
  orgNode: OrgNode
  responsibilities: ObjectiveResponsibility[]
}

interface ObjectiveDrawerProps {
  objective: StrategicObjective | null
  open: boolean
  onOpenChange: (open: boolean) => void
  perspectives: Perspective[]
  pillars: Pillar[]
  statuses: ObjectiveStatus[]
  orgNodes: OrgNode[]
  users: User[]
  roles: ResponsibilityRole[]
  cycles?: Cycle[]
}

interface Cycle {
  id: string
  name: string
  key: string
  startDate: string
  endDate: string
}

export function ObjectiveDrawer({
  objective,
  open,
  onOpenChange,
  perspectives,
  pillars,
  statuses,
  orgNodes,
  users,
  roles,
  cycles,
}: ObjectiveDrawerProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('details')

  if (!objective) return null

  const handleSaveDetails = async () => {
    // Simple update
    const title = prompt('Novo título:', objective.title)
    if (!title) return

    try {
      await updateObjectivePartial(objective.id, {
        title,
      })
      alert('Objetivo atualizado!')
      router.refresh()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating objective:', error)
      alert('Erro ao atualizar')
    }
  }

  const handleAddResponsibility = () => {
    // TODO: implement
    alert('Adicionar responsabilidade - implementar')
  }

  const handleAddLink = () => {
    // TODO: implement
    alert('Adicionar link - implementar')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{objective.title}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="keyresults">KRs</TabsTrigger>
            <TabsTrigger value="responsibilities">Responsabilidades</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Título</label>
                  <Input defaultValue={objective.title} />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <Textarea defaultValue={objective.description || ''} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Perspectiva</label>
                    <select className="w-full p-2 border rounded" defaultValue={objective.perspective.id}>
                      {perspectives.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select className="w-full p-2 border rounded" defaultValue={objective.status.id}>
                      {statuses.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Peso (%)</label>
                    <Input type="number" defaultValue={objective.weight} min="1" max="100" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Sponsor</label>
                    <select className="w-full p-2 border rounded" defaultValue={objective.sponsor.id}>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button onClick={handleSaveDetails}>Salvar Alterações</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keyresults" className="space-y-4">
            <KeyResultsTab objectiveId={objective.id} isEditMode={true} cycles={cycles || []} />
          </TabsContent>

          <TabsContent value="responsibilities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Responsabilidades</CardTitle>
              </CardHeader>
              <CardContent>
                {objective.responsibilities.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma responsabilidade definida</p>
                ) : (
                  <div className="space-y-2">
                    {objective.responsibilities.map(r => (
                      <div key={r.id} className="flex justify-between items-center p-2 border rounded">
                        <span>{r.responsibilityRole.name} - Peso: {r.contributionWeight}%</span>
                        <Button variant="outline" size="sm">Editar</Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={handleAddResponsibility} className="mt-4">
                  Adicionar Responsabilidade
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Nenhum link definido</p>
                <Button onClick={handleAddLink} className="mt-4">
                  Adicionar Link
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}