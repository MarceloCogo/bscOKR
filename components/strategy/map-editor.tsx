'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown, Edit, Trash2, Plus, Settings, BarChart3 } from 'lucide-react'
import { getStrategyMap, createObjectiveInRegion, reorderObjective, updateObjectivePartial, deleteObjective, upsertStrategyMapMeta } from '@/lib/actions/strategy'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ObjectiveFormDialog } from './objective-form-dialog'
import { ObjectiveEditDialog } from './objective-edit-dialog'
import { ContextSelector } from './context-selector'
import { ObjectiveKRPanel } from './objective-kr-panel'

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

type CardStyle = 'default' | 'pillar' | 'base'

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
  const [editingMeta, setEditingMeta] = useState<string | null>(null)
  const [editingMetaValue, setEditingMetaValue] = useState('')
  const [isSavingMeta, setIsSavingMeta] = useState(false)
  const [inlineTitle, setInlineTitle] = useState('')
  const [cycles, setCycles] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [selectedObjectiveForKR, setSelectedObjectiveForKR] = useState<any>(null)
  const [krPanelOpen, setKrPanelOpen] = useState(false)
  const [objectiveKRStatus, setObjectiveKRStatus] = useState<Record<string, boolean>>({})
  const [prevKrPanelOpen, setPrevKrPanelOpen] = useState(false)
  const router = useRouter()

  // Split view layout state
  const sidebarWidth = 450

  useEffect(() => {
    loadMap()
  }, [])

  // Handle map resize when sidebar opens/closes
  useEffect(() => {
    if (prevKrPanelOpen !== krPanelOpen) {
      // Wait for CSS animation to complete (250ms) before resizing
      const timer = setTimeout(() => {
        // Trigger map resize - this would need to be implemented in the map library
        // For now, we'll trigger a window resize event as fallback
        window.dispatchEvent(new Event('resize'))
      }, 250)

      setPrevKrPanelOpen(krPanelOpen)
      return () => clearTimeout(timer)
    }
  }, [krPanelOpen, prevKrPanelOpen])

  const loadMap = async () => {
    try {
      const mapData = await getStrategyMap()
      setData(mapData)

      const [perspectivesRes, pillarsRes, statusesRes, usersRes, orgNodesRes, cyclesRes, rolesRes, krCountRes] = await Promise.all([
        fetch('/api/config/perspectives'),
        fetch('/api/config/pillars'),
        fetch('/api/config/objective-statuses'),
        fetch('/api/users'),
        fetch('/api/org'),
        fetch('/api/cycle'),
        fetch('/api/config/roles'),
        fetch('/api/objectives/kr-count'),
      ])

      if (perspectivesRes.ok) setPerspectives(await perspectivesRes.json())
      if (pillarsRes.ok) setPillars(await pillarsRes.json())
      if (statusesRes.ok) setStatuses(await statusesRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (orgNodesRes.ok) setOrgNodes(await orgNodesRes.json())
      if (cyclesRes.ok) {
        const cyclesData = await cyclesRes.json()
        setCycles(cyclesData.cycles || [])
      }
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        setRoles(rolesData.roles || [])
      }
      if (krCountRes.ok) {
        const krData = await krCountRes.json()
        setObjectiveKRStatus(krData.krStatusMap || {})
      }
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
      await loadMap()
    } catch (error) {
      console.error('Error changing context:', error)
    }
  }

  const handleCreateInline = async (region: string, title: string) => {
    if (!title?.trim()) return

    try {
      await createObjectiveInRegion({
        mapRegion: region,
        title: title.trim(),
      })
      setCreatingInRegion(null)
      setInlineTitle('')
      await loadMap()
      toast.success('Objetivo criado com sucesso')
    } catch (error) {
      console.error('Error creating objective:', error)
      toast.error(`Erro ao criar objetivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
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

  const handleOpenKRPanel = (objective: any) => {
    setSelectedObjectiveForKR(objective)
    setKrPanelOpen(true)
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
    setIsSavingMeta(true)
    try {
      await upsertStrategyMapMeta({ [field]: value || undefined })
      setEditingMeta(null)
      setEditingMetaValue('')
      await loadMap()
      toast.success('Salvo com sucesso')
    } catch (error) {
      console.error('Error updating meta:', error)
      toast.error(`Erro ao salvar ${field === 'ambitionText' ? 'ambição' : 'proposta de valor'}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsSavingMeta(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F4F4F4]">
      <div className="text-gray-500">Carregando mapa...</div>
    </div>
  }

  if (!data) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F4F4F4]">
      <div className="text-gray-500">Erro ao carregar mapa</div>
    </div>
  }

  if (data.needsContext) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F4F4]">
        <div className="max-w-2xl w-full mx-4 bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2 text-gray-800">Selecione um Contexto Organizacional</h3>
          <p className="text-gray-500 mb-6">
            Para visualizar e editar o mapa estratégico, você precisa selecionar um contexto organizacional ativo.
          </p>
          <Button onClick={() => router.push('/app/organization')} className="bg-[#E87722] hover:bg-[#d06a1e]">
            Ir para Estrutura Organizacional
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#F4F4F4]">
      {/* Map Area - Dynamic width */}
      <div
        className={`transition-all duration-250 ease-out ${
          krPanelOpen ? `w-[calc(100%-450px)]` : 'w-full'
        }`}
      >
        <div className="min-h-screen py-1">
          <div className="max-w-[1280px] mx-auto px-2">
        {/* Header - Hide title in view mode, show in edit mode */}
        <div className={`flex justify-between items-center mb-2 ${!editMode && data.orgNode ? 'justify-end' : ''}`}>
          {editMode && (
            <div>
              <h1 className="text-sm font-bold text-gray-800">Mapa Estratégico</h1>
              <p className="text-gray-500 text-[10px] mt-0.5">Contexto: {data.orgNode?.name}</p>
            </div>
          )}
          <div className="flex items-center space-x-3">
            <div className="flex bg-white rounded-lg p-1 border border-gray-200">
              <Button
                size="sm"
                variant={!editMode ? "default" : "ghost"}
                onClick={() => setEditMode(false)}
                className={!editMode ? "bg-gray-700 text-white" : "text-gray-600"}
              >
                Visualizar
              </Button>
              <Button
                size="sm"
                variant={editMode ? "default" : "ghost"}
                onClick={() => setEditMode(true)}
                disabled={false}
                className={editMode ? "bg-[#E87722] hover:bg-[#d06a1e] text-white" : "text-gray-600"}
              >
                Editar mapa
              </Button>
            </div>
          </div>
        </div>

        <ContextSelector
          currentContext={data.orgNode}
          allContexts={orgNodes}
          onContextChange={handleContextChange}
        />

        {/* Ambição Estratégica */}
        <div className="text-center mt-2 mb-2">
          <h2 className="text-sm font-bold text-gray-800">Ambição Estratégica</h2>
          {editMode ? (
            <div className="max-w-2xl mx-auto mt-1 bg-white rounded-md border border-gray-200 p-2">
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
                      disabled={isSavingMeta}
                      onClick={() => handleEditMeta('ambitionText', editingMetaValue)}
                      className="bg-[#E87722] hover:bg-[#d06a1e]"
                    >
                      {isSavingMeta ? 'Salvando...' : 'Salvar'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSavingMeta}
                      onClick={() => setEditingMeta(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-base text-gray-600 cursor-pointer hover:bg-gray-50 p-3 rounded-md"
                  onClick={() => {
                    setEditingMeta('ambitionText')
                    setEditingMetaValue(data.meta?.ambitionText || '')
                  }}
                >
                  {data.meta?.ambitionText || 'Clique para editar a ambição estratégica...'}
                </div>
              )}
            </div>
          ) : (
            <p className="text-base text-gray-500 max-w-2xl mx-auto mt-4">
              {data.meta?.ambitionText || 'Texto da ambição não definido'}
            </p>
          )}
        </div>

        {/* Focos Estratégicos de Crescimento */}
        <div className="mb-2">
          <h2 className="text-sm font-semibold mb-2 text-center text-gray-700">Focos de Crescimento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[0, 1, 2].map(index => {
              const objective = data.regions?.growthFocus?.[index]
              return (
                <div key={index} className="bg-white rounded-md border border-[#CFCFCF] p-1.5 shadow-sm">
                  {objective ? (
                    <ObjectiveCard
                      objective={objective}
                      onEdit={() => setEditingObjective(objective)}
                      onDelete={() => handleDeleteObjective(objective.id)}
                      onView={() => handleOpenKRPanel(objective)}
                      canReorder={true}
                      onReorderUp={() => handleReorderObjective(objective.id, 'up')}
                      onReorderDown={() => handleReorderObjective(objective.id, 'down')}
                      showControls={editMode}
                      style="default"
                      hasKRs={objectiveKRStatus[objective.id] || false}
                      isSelected={selectedObjectiveForKR?.id === objective.id && krPanelOpen}
                    />
                  ) : editMode ? (
                    creatingInRegion === `GROWTH_FOCUS_${index}` ? (
                      <div className="border border-[#E87722] rounded-md p-4">
                        <input
                          type="text"
                          className="w-full p-2 border rounded text-sm"
                          placeholder="Digite o título do foco estratégico..."
                          autoFocus
                          value={inlineTitle}
                          onChange={(e) => setInlineTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateInline('GROWTH_FOCUS', inlineTitle)
                            } else if (e.key === 'Escape') {
                              setCreatingInRegion(null)
                              setInlineTitle('')
                            }
                          }}
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            className="bg-[#E87722] hover:bg-[#d06a1e]"
                            onClick={() => {
                              if (inlineTitle.trim()) {
                                handleCreateInline('GROWTH_FOCUS', inlineTitle.trim())
                              }
                            }}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCreatingInRegion(null)
                              setInlineTitle('')
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-300 text-gray-600"
                          onClick={() => setCreatingInRegion(`GROWTH_FOCUS_${index}`)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar foco
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      Foco não definido
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Proposta de Valor */}
        <div className="mb-2">
          <h2 className="text-sm font-semibold mb-2 text-center text-gray-700">Proposta de Valor</h2>
          <div className="bg-white rounded-lg border border-[#CFCFCF] overflow-hidden shadow-sm">
            <div className="h-[4px] bg-[#E87722]"></div>
            <div className="p-2 text-center">
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
                          disabled={isSavingMeta}
                          onClick={() => handleEditMeta('valuePropositionText', editingMetaValue)}
                          className="bg-[#E87722] hover:bg-[#d06a1e]"
                        >
                          {isSavingMeta ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSavingMeta}
                          onClick={() => setEditingMeta(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-lg font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 p-3 rounded-md"
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
                <p className="text-lg font-semibold text-gray-700">
                  {data.meta?.valuePropositionText || 'Texto da proposta de valor não definido'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pilares */}
        <div className="mb-2">
          <h2 className="text-sm font-semibold mb-2 text-center text-gray-700">Pilares</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {/* Oferta */}
            <div className="bg-white rounded-lg border border-[#CFCFCF] p-1.5 shadow-sm">
              <h3 className="font-semibold mb-1 text-center text-gray-700 pb-1 border-b border-gray-200">Oferta</h3>
              <div className="space-y-1" id="pillars-section">
                {data.regions?.pillarOffer?.map((obj: any) => (
                  <ObjectiveCard
                    key={obj.id}
                    objective={obj}
                    onEdit={() => setEditingObjective(obj)}
                    onDelete={() => handleDeleteObjective(obj.id)}
                    onView={() => handleOpenKRPanel(obj)}
                    canReorder={true}
                    onReorderUp={() => handleReorderObjective(obj.id, 'up')}
                    onReorderDown={() => handleReorderObjective(obj.id, 'down')}
                    showControls={editMode}
                    style="pillar"
                    hasKRs={objectiveKRStatus[obj.id] || false}
                    isSelected={selectedObjectiveForKR?.id === obj.id && krPanelOpen}
                  />
                ))}
                {editMode && (
                  creatingInRegion === 'PILLAR_OFFER' ? (
                    <div className="border border-[#E87722] rounded-md p-4">
                      <input
                        type="text"
                        className="w-full p-2 border rounded text-sm"
                        placeholder="Digite o título do objetivo..."
                        autoFocus
                        value={inlineTitle}
                        onChange={(e) => setInlineTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateInline('PILLAR_OFFER', inlineTitle)
                          } else if (e.key === 'Escape') {
                            setCreatingInRegion(null)
                            setInlineTitle('')
                          }
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="bg-[#E87722] hover:bg-[#d06a1e]"
                          onClick={() => {
                            if (inlineTitle.trim()) {
                              handleCreateInline('PILLAR_OFFER', inlineTitle.trim())
                            }
                          }}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCreatingInRegion(null)
                            setInlineTitle('')
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="bg-[#F2C7A8] rounded-md p-3 cursor-pointer hover:bg-[#e8b896] transition-colors"
                      onClick={() => setCreatingInRegion('PILLAR_OFFER')}
                    >
                      <div className="text-sm text-center text-gray-700">+ Adicionar objetivo</div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Receita */}
            <div className="bg-white rounded-lg border border-[#CFCFCF] p-1.5 shadow-sm">
              <h3 className="font-semibold mb-1 text-center text-gray-700 pb-1 border-b border-gray-200">Receita</h3>
              <div className="space-y-1">
                {data.regions?.pillarRevenue?.map((obj: any) => (
                  <ObjectiveCard
                    key={obj.id}
                    objective={obj}
                    onEdit={() => setEditingObjective(obj)}
                    onDelete={() => handleDeleteObjective(obj.id)}
                    onView={() => handleOpenKRPanel(obj)}
                    canReorder={true}
                    onReorderUp={() => handleReorderObjective(obj.id, 'up')}
                    onReorderDown={() => handleReorderObjective(obj.id, 'down')}
                    showControls={editMode}
                    style="pillar"
                    hasKRs={objectiveKRStatus[obj.id] || false}
                    isSelected={selectedObjectiveForKR?.id === obj.id && krPanelOpen}
                  />
                ))}
                {editMode && (
                  creatingInRegion === 'PILLAR_REVENUE' ? (
                    <div className="border border-[#E87722] rounded-md p-4">
                      <input
                        type="text"
                        className="w-full p-2 border rounded text-sm"
                        placeholder="Digite o título do objetivo..."
                        autoFocus
                        value={inlineTitle}
                        onChange={(e) => setInlineTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateInline('PILLAR_REVENUE', inlineTitle)
                          } else if (e.key === 'Escape') {
                            setCreatingInRegion(null)
                            setInlineTitle('')
                          }
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="bg-[#E87722] hover:bg-[#d06a1e]"
                          onClick={() => {
                            if (inlineTitle.trim()) {
                              handleCreateInline('PILLAR_REVENUE', inlineTitle.trim())
                            }
                          }}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCreatingInRegion(null)
                            setInlineTitle('')
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="bg-[#F2C7A8] rounded-md p-3 cursor-pointer hover:bg-[#e8b896] transition-colors"
                      onClick={() => setCreatingInRegion('PILLAR_REVENUE')}
                    >
                      <div className="text-sm text-center text-gray-700">+ Adicionar objetivo</div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Eficiência */}
            <div className="bg-white rounded-lg border border-[#CFCFCF] p-1.5 shadow-sm">
              <h3 className="font-semibold mb-1 text-center text-gray-700 pb-1 border-b border-gray-200">Eficiência</h3>
              <div className="space-y-1">
                {data.regions?.pillarEfficiency?.map((obj: any) => (
                  <ObjectiveCard
                    key={obj.id}
                    objective={obj}
                    onEdit={() => setEditingObjective(obj)}
                    onDelete={() => handleDeleteObjective(obj.id)}
                    onView={() => handleOpenKRPanel(obj)}
                    canReorder={true}
                    onReorderUp={() => handleReorderObjective(obj.id, 'up')}
                    onReorderDown={() => handleReorderObjective(obj.id, 'down')}
                    showControls={editMode}
                    style="pillar"
                    hasKRs={objectiveKRStatus[obj.id] || false}
                    isSelected={selectedObjectiveForKR?.id === obj.id && krPanelOpen}
                  />
                ))}
                {editMode && (
                  creatingInRegion === 'PILLAR_EFFICIENCY' ? (
                    <div className="border border-[#E87722] rounded-md p-4">
                      <input
                        type="text"
                        className="w-full p-2 border rounded text-sm"
                        placeholder="Digite o título do objetivo..."
                        autoFocus
                        value={inlineTitle}
                        onChange={(e) => setInlineTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleCreateInline('PILLAR_EFFICIENCY', inlineTitle)
                          } else if (e.key === 'Escape') {
                            setCreatingInRegion(null)
                            setInlineTitle('')
                          }
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="bg-[#E87722] hover:bg-[#d06a1e]"
                          onClick={() => {
                            if (inlineTitle.trim()) {
                              handleCreateInline('PILLAR_EFFICIENCY', inlineTitle.trim())
                            }
                          }}
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCreatingInRegion(null)
                            setInlineTitle('')
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="bg-[#F2C7A8] rounded-md p-3 cursor-pointer hover:bg-[#e8b896] transition-colors"
                      onClick={() => setCreatingInRegion('PILLAR_EFFICIENCY')}
                    >
                      <div className="text-sm text-center text-gray-700">+ Adicionar objetivo</div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Base */}
        <div className="mb-2">
          <h2 className="text-sm font-semibold mb-2 text-center text-gray-700">Base</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[0, 1, 2].map(index => {
              const objective = data.regions?.peopleBase?.[index]
              const baseLabels = ['Pessoas', 'Cultura', 'Talentos']
              return (
                <div key={index} className="bg-[#DCEFE8] rounded-lg p-1.5">
                  <div className="text-center mb-1">
                    <span className="text-xs font-semibold text-gray-700">
                      {baseLabels[index]}
                    </span>
                  </div>
                  {objective ? (
                    <ObjectiveCard
                      objective={objective}
                      onEdit={() => setEditingObjective(objective)}
                      onDelete={() => handleDeleteObjective(objective.id)}
                      onView={() => handleOpenKRPanel(objective)}
                      canReorder={true}
                      onReorderUp={() => handleReorderObjective(objective.id, 'up')}
                      onReorderDown={() => handleReorderObjective(objective.id, 'down')}
                      showControls={editMode}
                      style="base"
                      hasKRs={objectiveKRStatus[objective.id] || false}
                      isSelected={selectedObjectiveForKR?.id === objective.id && krPanelOpen}
                    />
                  ) : editMode ? (
                    creatingInRegion === `PEOPLE_BASE_${index}` ? (
                      <div className="border border-[#E87722] rounded-md p-4">
                        <input
                          type="text"
                          className="w-full p-2 border rounded text-sm"
                          placeholder="Digite o título do objetivo..."
                          autoFocus
                          value={inlineTitle}
                          onChange={(e) => setInlineTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateInline('PEOPLE_BASE', inlineTitle)
                            } else if (e.key === 'Escape') {
                              setCreatingInRegion(null)
                              setInlineTitle('')
                            }
                          }}
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            className="bg-[#E87722] hover:bg-[#d06a1e]"
                            onClick={() => {
                              if (inlineTitle.trim()) {
                                handleCreateInline('PEOPLE_BASE', inlineTitle.trim())
                              }
                            }}
                          >
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCreatingInRegion(null)
                              setInlineTitle('')
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-gray-400 text-gray-600 bg-white"
                          onClick={() => setCreatingInRegion(`PEOPLE_BASE_${index}`)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      Não definido
                    </div>
                  )}
                </div>
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
        </div>
      </div>

      {/* Sidebar Area - Fixed width */}
      <div
        className={`fixed right-0 top-0 h-full w-[450px] bg-white border-l border-neutral-200 shadow-lg transition-transform duration-250 ease-out ${
          krPanelOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ zIndex: 40 }}
      >
        <ObjectiveKRPanel
          objective={selectedObjectiveForKR}
          open={krPanelOpen}
          onOpenChange={setKrPanelOpen}
          cycles={cycles}
        />
      </div>
    </div>
  )
}

function ObjectiveCard({
  objective,
  onEdit,
  onDelete,
  onView,
  canReorder,
  onReorderUp,
  onReorderDown,
  showControls,
  style = 'default',
  hasKRs = false,
  isSelected = false
}: {
  objective: any,
  onEdit?: () => void,
  onDelete?: () => void,
  onView?: () => void,
  canReorder?: boolean,
  onReorderUp?: () => void,
  onReorderDown?: () => void,
  showControls?: boolean,
  style?: CardStyle,
  hasKRs?: boolean,
  isSelected?: boolean
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

  const getContainerClass = () => {
    switch (style) {
      case 'pillar':
        return 'bg-[#F2C7A8] rounded-md p-2'
      case 'base':
        return 'bg-white/60 rounded-md p-2'
      default:
        return 'bg-white border border-gray-200 rounded-md p-2'
    }
  }

  return (
    <div
      className={`${getContainerClass()} mb-1 relative ${!showControls ? 'cursor-pointer hover:ring-2 hover:ring-[#E87722]' : ''} ${isSelected ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}
      onClick={() => !showControls && onView?.()}
    >
      {/* KR indicator icon */}
      <div className="absolute top-1 right-1 z-10">
        <BarChart3 className={`w-3 h-3 ${hasKRs ? 'text-green-600' : 'text-gray-400'}`} />
      </div>

      <div className="flex items-start justify-between pr-4">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="space-y-1">
              <input
                type="text"
                className="w-full p-1 border rounded text-xs"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave()
                  if (e.key === 'Escape') handleTitleCancel()
                }}
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-5 px-1 text-xs" onClick={handleTitleSave}>
                  ✓
                </Button>
                <Button size="sm" variant="ghost" className="h-5 px-1 text-xs" onClick={handleTitleCancel}>
                  ✕
                </Button>
              </div>
            </div>
          ) : (
            <h4
              className={`font-medium text-xs ${showControls ? 'cursor-pointer hover:text-[#E87722]' : ''}`}
              onClick={handleTitleClick}
            >
              {objective.title}
            </h4>
          )}
          <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
            <span>{objective.perspective.name}</span>
            <span className={`px-1 py-0.5 rounded text-[10px] ${objective.status.color ? '' : 'bg-gray-100'}`}
                  style={objective.status.color ? { backgroundColor: objective.status.color } : {}}>
              {objective.status.name}
            </span>
          </div>
        </div>
        {showControls && (
          <div className="flex items-center gap-0.5 ml-1">
            {canReorder && (
              <>
                <Button variant="ghost" size="sm" onClick={onReorderUp} className="p-0.5 h-5 w-5">
                  <ArrowUp className="h-2.5 w-2.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onReorderDown} className="p-0.5 h-5 w-5">
                  <ArrowDown className="h-2.5 w-2.5" />
                </Button>
              </>
            )}
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit} className="p-0.5 h-5 w-5">
                <Edit className="h-2.5 w-2.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={onDelete} className="p-0.5 h-5 w-5 text-red-600">
                <Trash2 className="h-2.5 w-2.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
