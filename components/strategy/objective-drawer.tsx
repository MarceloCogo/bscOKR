'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { updateObjectivePartial } from '@/lib/actions/strategy'
import { KeyResultsTab } from './key-results-tab'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
  initialTab?: 'details' | 'keyresults' | 'responsibilities' | 'links'
  autoOpenCreateKR?: boolean
}

export function ObjectiveDrawer({
  objective,
  open,
  onOpenChange,
  perspectives,
  pillars,
  statuses,
  users,
  initialTab = 'details',
  autoOpenCreateKR = false,
}: ObjectiveDrawerProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'details' | 'keyresults' | 'responsibilities' | 'links'>(initialTab)
  const [isSavingDetails, setIsSavingDetails] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    perspectiveId: '',
    pillarId: '',
    statusId: '',
    sponsorUserId: '',
  })

  useEffect(() => {
    if (!objective) return

    setFormData({
      title: objective.title || '',
      description: objective.description || '',
      perspectiveId: objective.perspective.id,
      pillarId: objective.pillar?.id || '',
      statusId: objective.status.id,
      sponsorUserId: objective.sponsor.id,
    })
  }, [objective])

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
    }
  }, [open, initialTab, objective?.id])

  if (!objective) return null

  const handleSaveDetails = async () => {
    if (!formData.title.trim()) {
      toast.error('Informe um titulo para o objetivo')
      return
    }

    setIsSavingDetails(true)
    try {
      await updateObjectivePartial(objective.id, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        perspectiveId: formData.perspectiveId,
        pillarId: formData.pillarId || undefined,
        statusId: formData.statusId,
        sponsorUserId: formData.sponsorUserId,
      })
      toast.success('Objetivo atualizado com sucesso')
      router.refresh()
    } catch (error) {
      console.error('Error updating objective:', error)
      toast.error('Erro ao atualizar objetivo')
    } finally {
      setIsSavingDetails(false)
    }
  }

  const handleAddResponsibility = () => {
    toast.info('Responsabilidades ainda em implementacao neste painel')
  }

  const handleAddLink = () => {
    toast.info('Links ainda em implementacao neste painel')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px] max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader>
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
            <DialogTitle className="text-xl font-semibold tracking-tight">{objective.title}</DialogTitle>
            <p className="mt-1 text-sm text-neutral-600">Edite os detalhes e acompanhe os Key Results sem sair do contexto.</p>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'details' | 'keyresults' | 'responsibilities' | 'links')}
          className="px-6 pb-6"
        >
          <TabsList className="mt-4 grid w-full grid-cols-4 bg-neutral-100">
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
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Descrição</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="min-h-[96px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Perspectiva</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.perspectiveId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, perspectiveId: e.target.value }))}
                    >
                      {perspectives.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.statusId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, statusId: e.target.value }))}
                    >
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
                    <label className="block text-sm font-medium mb-1">Pilar</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.pillarId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, pillarId: e.target.value }))}
                    >
                      <option value="">Sem pilar</option>
                      {pillars.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Sponsor</label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.sponsorUserId}
                      onChange={(e) => setFormData((prev) => ({ ...prev, sponsorUserId: e.target.value }))}
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
                  Peso atual: <span className="font-medium text-neutral-900">{objective.weight}%</span>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveDetails} disabled={isSavingDetails}>
                    {isSavingDetails ? 'Salvando...' : 'Salvar alteracoes'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keyresults" className="space-y-4">
            <KeyResultsTab
              objectiveId={objective.id}
              isEditMode={true}
              autoOpenCreateForm={autoOpenCreateKR && activeTab === 'keyresults'}
            />
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
