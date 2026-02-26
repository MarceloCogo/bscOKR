'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Edit, Trash2, Plus, Settings } from 'lucide-react'
import { getStrategyMap, createObjectiveInRegion, reorderObjective, upsertStrategyMapMeta, updateObjectivePartial, deleteObjective } from '@/lib/actions/strategy'
import { useRouter } from 'next/navigation'
import { ObjectiveFormDialog } from './objective-form-dialog'
import { ObjectiveEditDialog } from './objective-edit-dialog'
import { ContextSelector } from './context-selector'
import { EmptyRegionCard } from './empty-region-card'

interface StrategicObjective {
  id: string
  title: string
  description?: string
  mapRegion: string
  orderIndex: number
  perspective: { name: string }
  pillar?: { name: string } | null
  status: { name: string; color?: string | null }
  sponsor: { name: string }
  weight: number
}

interface StrategyMapData {
  needsContext: boolean
  orgNode: { id: string; name: string; type: { name: string } } | null
  isEditAllowed: boolean
  meta: { ambitionText?: string | null; valuePropositionText?: string | null } | null
  regions: {
    ambition: StrategicObjective | null
    growthFocus: StrategicObjective[]
    valueProposition: StrategicObjective | null
    pillarOffer: StrategicObjective[]
    pillarRevenue: StrategicObjective[]
    pillarEfficiency: StrategicObjective[]
    peopleBase: StrategicObjective[]
  }
}

export function MapEditor() {
  const [data, setData] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [perspectives, setPerspectives] = useState<any[]>([])
  const [pillars, setPillars] = useState<any[]>([])
  const [statuses, setStatuses] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [orgNodes, setOrgNodes] = useState<any[]>([])
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [showObjectiveDialog, setShowObjectiveDialog] = useState(false)
  const [editingObjective, setEditingObjective] = useState<any>(null)
  const [creatingInRegion, setCreatingInRegion] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [editingTitleValue, setEditingTitleValue] = useState('')
  const [editingMeta, setEditingMeta] = useState<string | null>(null)
  const [editingMetaValue, setEditingMetaValue] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadMap()
  }, [])

  const loadMap = async () => {
    try {
      const mapData = await getStrategyMap()
      setData(mapData)

      // Load required data for objective creation
      const [perspectivesRes, pillarsRes, statusesRes, usersRes, orgNodesRes] = await Promise.all([
        fetch('/api/config/perspectives'),
        fetch('/api/config/pillars'),
        fetch('/api/config/objective-statuses'),
        fetch('/api/users'),
        fetch('/api/org'),
      ])

      if (perspectivesRes.ok) setPerspectives(await perspectivesRes.json())
      if (pillarsRes.ok) setPillars(await pillarsRes.json())
      if (statusesRes.ok) setStatuses(await statusesRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (orgNodesRes.ok) setOrgNodes(await orgNodesRes.json())
    } catch (error) {
      console.error('Error loading map:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateObjective = (mapRegion: string) => {
    setSelectedRegion(mapRegion)
    setShowObjectiveDialog(true)
  }

  const handleContextChange = async (orgNodeId: string) => {
    try {
      await fetch('/api/org/set-active-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgNodeId }),
      })
      // Recarregar dados após mudança de contexto
      await loadMap()
    } catch (error) {
      console.error('Error changing context:', error)
    }
  }

  const handleCreateInline = async (region: string, title: string) => {
    if (!title.trim()) return

    try {
      await createObjectiveInRegion({
        mapRegion: region,
        title: title.trim(),
      })
      setCreatingInRegion(null)
      await loadMap()
    } catch (error) {
      console.error('Error creating objective:', error)
    }
  }

  const handleEditTitle = async (objective: any, newTitle: string) => {
    if (!newTitle.trim()) return

    try {
      await updateObjectivePartial(objective.id, { title: newTitle.trim() })
      setEditingTitle(null)
      setEditingTitleValue('')
      await loadMap()
    } catch (error) {
      console.error('Error updating title:', error)
    }
  }

  const handleDeleteObjective = async (objectiveId: string) => {
    if (!confirm('Tem certeza que deseja excluir este objetivo? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      await deleteObjective(objectiveId)
      await loadMap()
    } catch (error) {
      console.error('Error deleting objective:', error)
    }
  }

  const handleReorderObjective = async (objectiveId: string, direction: 'up' | 'down') => {
    try {
      await reorderObjective(objectiveId, direction)
      await loadMap()
    } catch (error) {
      console.error('Error reordering objective:', error)
    }
  }

  const handleEditMeta = async (field: 'ambitionText' | 'valuePropositionText', value: string) => {
    try {
      await upsertStrategyMapMeta({ [field]: value || undefined })
      setEditingMeta(null)
      setEditingMetaValue('')
      await loadMap()
    } catch (error) {
      console.error('Error updating meta:', error)
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">Carregando mapa...</div>
  }

  if (!data) {
    return <div className="flex justify-center p-8">Erro ao carregar mapa</div>
  }

  if (data.needsContext) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Selecione um Contexto Organizacional</h3>
            <p className="text-muted-foreground mb-6">
              Para visualizar e editar o mapa estratégico, você precisa selecionar um contexto organizacional ativo.
            </p>
            <Button onClick={() => router.push('/app/organization')}>
              Ir para Estrutura Organizacional
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mapa Estratégico</h1>
          <p className="text-muted-foreground">Contexto: {data.orgNode?.name}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              size="sm"
              variant={!editMode ? "default" : "ghost"}
              onClick={() => setEditMode(false)}
            >
              Visualizar
            </Button>
            <Button
              size="sm"
              variant={editMode ? "default" : "ghost"}
              onClick={() => setEditMode(true)}
              disabled={false} // Admin sempre pode editar
            >
              Editar mapa
            </Button>
          </div>
          {editMode && (
            <Button
              size="sm"
              onClick={() => {
                // Scroll to first empty region or show guide
                const firstEmptyIndex = data.regions.growthFocus.findIndex((obj: any) => !obj)
                if (firstEmptyIndex !== -1) {
                  setCreatingInRegion(`GROWTH_FOCUS_${firstEmptyIndex}`)
                  document.getElementById(`growth-focus-${firstEmptyIndex}`)?.scrollIntoView({ behavior: 'smooth' })
                } else {
                  // Scroll to pillars section
                  document.getElementById('pillars-section')?.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Objetivo
            </Button>
          )}
        </div>
      </div>

      <ContextSelector
        currentContext={data.orgNode}
        allContexts={orgNodes}
        onContextChange={handleContextChange}
      />

      {/* Ambição Estratégica */}
      <div className="text-center mb-12">
        <h2 className="text-xl font-semibold mb-4">Ambição Estratégica</h2>
        {editMode ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              {editingMeta === 'ambitionText' ? (
                <div className="space-y-3">
                  <textarea
                    className="w-full p-3 border rounded-md text-lg"
                    rows={4}
                    value={editingMetaValue}
                    onChange={(e) => setEditingMetaValue(e.target.value)}
                    placeholder="Digite o texto da ambição estratégica..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleEditMeta('ambitionText', editingMetaValue)}
                    >
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingMeta(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-lg cursor-pointer hover:bg-gray-50 p-3 rounded-md"
                  onClick={() => {
                    setEditingMeta('ambitionText')
                    setEditingMetaValue(data.meta?.ambitionText || '')
                  }}
                >
                  {data.meta?.ambitionText || 'Clique para editar a ambição estratégica...'}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {data.meta?.ambitionText || 'Texto da ambição não definido'}
          </p>
        )}
      </div>

      {/* Focos Estratégicos de Crescimento */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-6 text-center">Focos Estratégicos de Crescimento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map(index => {
            const objective = data.regions.growthFocus[index]
            return (
              <Card key={index} className="min-h-[120px]">
                <CardContent className="p-4">
                  {objective ? (
                    <ObjectiveCard
                      objective={objective}
                      onEdit={() => setEditingObjective(objective)}
                      onDelete={() => handleDeleteObjective(objective.id)}
                      canReorder={true}
                      onReorderUp={() => handleReorderObjective(objective.id, 'up')}
                      onReorderDown={() => handleReorderObjective(objective.id, 'down')}
                      showControls={editMode}
                    />
                  ) : editMode ? (
                    creatingInRegion === `GROWTH_FOCUS_${index}` ? (
                      <Card className="border-blue-300">
                        <CardContent className="p-4">
                          <input
                            type="text"
                            className="w-full p-2 border rounded text-sm"
                            placeholder="Digite o título do foco estratégico..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCreateInline('GROWTH_FOCUS', (e.target as HTMLInputElement).value)
                              } else if (e.key === 'Escape') {
                                setCreatingInRegion(null)
                              }
                            }}
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                const card = (e.target as HTMLElement).closest('.border-blue-300')
                                const input = card?.querySelector('input') as HTMLInputElement
                                if (input?.value) {
                                  handleCreateInline('GROWTH_FOCUS', input.value)
                                }
                              }}
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCreatingInRegion(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-center py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCreatingInRegion(`GROWTH_FOCUS_${index}`)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar foco
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      Foco não definido
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Proposta de Valor */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-6 text-center">Proposta de Valor</h2>
        <Card className="bg-muted">
          <CardContent className="p-8 text-center">
            {editMode ? (
              <div>
                {editingMeta === 'valuePropositionText' ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full p-3 border rounded-md text-lg"
                      rows={4}
                      value={editingMetaValue}
                      onChange={(e) => setEditingMetaValue(e.target.value)}
                      placeholder="Digite o texto da proposta de valor..."
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditMeta('valuePropositionText', editingMetaValue)}
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingMeta(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="text-lg cursor-pointer hover:bg-gray-50 p-3 rounded-md"
                    onClick={() => {
                      setEditingMeta('valuePropositionText')
                      setEditingMetaValue(data.meta?.valuePropositionText || '')
                    }}
                  >
                    {data.meta?.valuePropositionText || 'Clique para editar a proposta de valor...'}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-lg">
                {data.meta?.valuePropositionText || 'Texto da proposta de valor não definido'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pilares */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-6 text-center">Pilares</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-4 text-center">Oferta</h3>
            <div className="space-y-2" id="pillars-section">
              {data.regions.pillarOffer.map((obj: any) => (
                <ObjectiveCard
                  key={obj.id}
                  objective={obj}
                  onEdit={() => setEditingObjective(obj)}
                  onDelete={() => handleDeleteObjective(obj.id)}
                  canReorder={true}
                  onReorderUp={() => handleReorderObjective(obj.id, 'up')}
                  onReorderDown={() => handleReorderObjective(obj.id, 'down')}
                  showControls={editMode}
                />
              ))}
              {data.regions.pillarOffer.length === 0 && editMode && (
                creatingInRegion === 'PILLAR_OFFER' ? (
                  <Card className="border-blue-300">
                    <CardContent className="p-4">
                      <input
                        type="text"
                        className="w-full p-2 border rounded text-sm"
                        placeholder="Digite o título do objetivo..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateInline('PILLAR_OFFER', (e.target as HTMLInputElement).value)
                          } else if (e.key === 'Escape') {
                            setCreatingInRegion(null)
                          }
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            const card = (e.target as HTMLElement).closest('.border-blue-300')
                            const input = card?.querySelector('input') as HTMLInputElement
                            if (input?.value) {
                              handleCreateInline('PILLAR_OFFER', input.value)
                            }
                          }}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCreatingInRegion(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <EmptyRegionCard
                    title="Pilar Oferta"
                    description="Defina capacidades de produto/serviço"
                    onAddClick={() => setCreatingInRegion('PILLAR_OFFER')}
                  />
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-center">Receita</h3>
            <div className="space-y-2">
              {data.regions.pillarRevenue.map((obj: any) => (
                <ObjectiveCard
                  key={obj.id}
                  objective={obj}
                  onEdit={() => setEditingObjective(obj)}
                  onDelete={() => handleDeleteObjective(obj.id)}
                  canReorder={true}
                  onReorderUp={() => handleReorderObjective(obj.id, 'up')}
                  onReorderDown={() => handleReorderObjective(obj.id, 'down')}
                  showControls={editMode}
                />
              ))}
              {data.regions.pillarRevenue.length === 0 && editMode && (
                creatingInRegion === 'PILLAR_REVENUE' ? (
                  <Card className="border-blue-300">
                    <CardContent className="p-4">
                      <input
                        type="text"
                        className="w-full p-2 border rounded text-sm"
                        placeholder="Digite o título do objetivo..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateInline('PILLAR_REVENUE', (e.target as HTMLInputElement).value)
                          } else if (e.key === 'Escape') {
                            setCreatingInRegion(null)
                          }
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            const card = (e.target as HTMLElement).closest('.border-blue-300')
                            const input = card?.querySelector('input') as HTMLInputElement
                            if (input?.value) {
                              handleCreateInline('PILLAR_REVENUE', input.value)
                            }
                          }}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCreatingInRegion(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <EmptyRegionCard
                    title="Pilar Receita"
                    description="Defina estratégias de monetização"
                    onAddClick={() => setCreatingInRegion('PILLAR_REVENUE')}
                  />
                )
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-center">Eficiência</h3>
            <div className="space-y-2">
              {data.regions.pillarEfficiency.map((obj: any) => (
                <ObjectiveCard
                  key={obj.id}
                  objective={obj}
                  onEdit={() => setEditingObjective(obj)}
                  onDelete={() => handleDeleteObjective(obj.id)}
                  canReorder={true}
                  onReorderUp={() => handleReorderObjective(obj.id, 'up')}
                  onReorderDown={() => handleReorderObjective(obj.id, 'down')}
                  showControls={editMode}
                />
              ))}
              {data.regions.pillarEfficiency.length === 0 && editMode && (
                creatingInRegion === 'PILLAR_EFFICIENCY' ? (
                  <Card className="border-blue-300">
                    <CardContent className="p-4">
                      <input
                        type="text"
                        className="w-full p-2 border rounded text-sm"
                        placeholder="Digite o título do objetivo..."
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateInline('PILLAR_EFFICIENCY', (e.target as HTMLInputElement).value)
                          } else if (e.key === 'Escape') {
                            setCreatingInRegion(null)
                          }
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            const card = (e.target as HTMLElement).closest('.border-blue-300')
                            const input = card?.querySelector('input') as HTMLInputElement
                            if (input?.value) {
                              handleCreateInline('PILLAR_EFFICIENCY', input.value)
                            }
                          }}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCreatingInRegion(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <EmptyRegionCard
                    title="Pilar Eficiência"
                    description="Defina processos e operações otimizadas"
                    onAddClick={() => setCreatingInRegion('PILLAR_EFFICIENCY')}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Base */}
      <div>
        <h2 className="text-xl font-semibold mb-6 text-center">Base</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map(index => {
            const objective = data.regions.peopleBase[index]
            return (
              <Card key={index} className="min-h-[120px]">
                <CardContent className="p-4">
                  <div className="text-center mb-2">
                    <span className="text-sm font-medium">
                      {['Pessoas', 'Cultura', 'Talentos'][index]}
                    </span>
                  </div>
                  {objective ? (
                    <ObjectiveCard
                      objective={objective}
                      onEdit={() => setEditingObjective(objective)}
                      onDelete={() => handleDeleteObjective(objective.id)}
                      canReorder={true}
                      onReorderUp={() => handleReorderObjective(objective.id, 'up')}
                      onReorderDown={() => handleReorderObjective(objective.id, 'down')}
                      showControls={editMode}
                    />
                  ) : editMode ? (
                    creatingInRegion === `PEOPLE_BASE_${index}` ? (
                      <Card className="border-blue-300">
                        <CardContent className="p-4">
                          <div className="text-center mb-2">
                            <span className="text-sm font-medium">
                              {['Pessoas', 'Cultura', 'Talentos'][index]}
                            </span>
                          </div>
                          <input
                            type="text"
                            className="w-full p-2 border rounded text-sm"
                            placeholder="Digite o título do objetivo..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCreateInline('PEOPLE_BASE', (e.target as HTMLInputElement).value)
                              } else if (e.key === 'Escape') {
                                setCreatingInRegion(null)
                              }
                            }}
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                const card = (e.target as HTMLElement).closest('.border-blue-300')
                                const input = card?.querySelector('input') as HTMLInputElement
                                if (input?.value) {
                                  handleCreateInline('PEOPLE_BASE', input.value)
                                }
                              }}
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCreatingInRegion(null)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="text-center py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCreatingInRegion(`PEOPLE_BASE_${index}`)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      Não definido
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <ObjectiveFormDialog
        perspectives={perspectives}
        pillars={pillars}
        statuses={statuses}
        users={users}
        preselectedRegion={selectedRegion}
        open={showObjectiveDialog}
        onOpenChange={setShowObjectiveDialog}
      />

      {editingObjective && (
        <ObjectiveEditDialog
          objective={editingObjective}
          perspectives={perspectives}
          pillars={pillars}
          statuses={statuses}
          users={users}
          open={!!editingObjective}
          onOpenChange={(open) => !open && setEditingObjective(null)}
        />
      )}
    </div>
  )
}

function ObjectiveCard({
  objective,
  onEdit,
  onDelete,
  canReorder,
  onReorderUp,
  onReorderDown,
  showControls
}: {
  objective: any,
  onEdit?: () => void,
  onDelete?: () => void,
  canReorder?: boolean,
  onReorderUp?: () => void,
  onReorderDown?: () => void,
  showControls?: boolean
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(objective?.title || '')

  if (!objective) return null

  const handleTitleClick = () => {
    if (showControls) {
      setIsEditingTitle(true)
      setTitleValue(objective.title)
    }
  }

  const handleTitleSave = async () => {
    if (titleValue.trim() && titleValue !== objective.title) {
      try {
        await updateObjectivePartial(objective.id, { title: titleValue.trim() })
        setIsEditingTitle(false)
        // Trigger reload
        window.location.reload()
      } catch (error) {
        console.error('Error updating title:', error)
      }
    } else {
      setIsEditingTitle(false)
    }
  }

  const handleTitleCancel = () => {
    setTitleValue(objective.title)
    setIsEditingTitle(false)
  }

  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditingTitle ? (
              <div className="space-y-2">
                <input
                  type="text"
                  className="w-full p-1 border rounded text-sm"
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave()
                    if (e.key === 'Escape') handleTitleCancel()
                  }}
                  autoFocus
                />
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={handleTitleSave}>
                    ✓
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={handleTitleCancel}>
                    ✕
                  </Button>
                </div>
              </div>
            ) : (
              <h4
                className={`font-medium text-sm ${showControls ? 'cursor-pointer hover:text-blue-600' : ''}`}
                onClick={handleTitleClick}
              >
                {objective.title}
              </h4>
            )}
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>{objective.perspective.name}</span>
              <span className={`px-2 py-1 rounded text-xs ${objective.status.color ? '' : 'bg-gray-100'}`}
                    style={objective.status.color ? { backgroundColor: objective.status.color } : {}}>
                {objective.status.name}
              </span>
            </div>
          </div>
          {showControls && (
            <div className="flex items-center gap-1 ml-2">
              {canReorder && (
                <>
                  <Button variant="ghost" size="sm" onClick={onReorderUp} className="p-1 h-6 w-6">
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onReorderDown} className="p-1 h-6 w-6">
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </>
              )}
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={onEdit} className="p-1 h-6 w-6">
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={onDelete} className="p-1 h-6 w-6 text-red-600">
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

