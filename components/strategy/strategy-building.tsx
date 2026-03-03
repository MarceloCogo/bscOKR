'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight, Loader2, Pencil, Trash2, ArrowUp, ArrowDown, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { StrategyMapCanvas } from './strategy-map-canvas'
import { createObjectiveInRegion, deleteObjective, reorderObjective, updateObjectivePartial } from '@/lib/actions/strategy'

interface OrgNode {
  id: string
  name: string
  type: { name: string }
}

interface StrategicObjective {
  id: string
  title: string
  mapRegion: string
  orderIndex: number
  perspective?: { name: string } | null
  status?: { name: string; color?: string | null } | null
}

interface StrategyMapData {
  orgNode: OrgNode | null
  isEditAllowed: boolean
  meta?: {
    ambitionText?: string | null
    valuePropositionText?: string | null
  } | null
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

const REGION_CONFIG = [
  { key: 'ambition', mapRegion: 'AMBITION', label: 'Ambicao Estrategica', single: true },
  { key: 'growthFocus', mapRegion: 'GROWTH_FOCUS', label: 'Focos de Crescimento', single: false },
  { key: 'valueProposition', mapRegion: 'VALUE_PROPOSITION', label: 'Proposta de Valor', single: true },
  { key: 'pillarOffer', mapRegion: 'PILLAR_OFFER', label: 'Pilar Oferta', single: false },
  { key: 'pillarRevenue', mapRegion: 'PILLAR_REVENUE', label: 'Pilar Receita', single: false },
  { key: 'pillarEfficiency', mapRegion: 'PILLAR_EFFICIENCY', label: 'Pilar Eficiencia', single: false },
  { key: 'peopleBase', mapRegion: 'PEOPLE_BASE', label: 'Base Pessoas/Cultura/Talentos', single: false },
] as const

function StrategyMapPreview({
  title,
  data,
  loading,
  forceReadonly = false,
}: {
  title: string
  data: StrategyMapData | null
  loading: boolean
  forceReadonly?: boolean
}) {
  const summary = data
    ? {
        growth: data.regions.growthFocus.length,
        pillars:
          data.regions.pillarOffer.length +
          data.regions.pillarRevenue.length +
          data.regions.pillarEfficiency.length,
        base: data.regions.peopleBase.length,
      }
    : null

  const showEditable = data?.isEditAllowed && !forceReadonly

  return (
    <Card className="flex h-full flex-col border-neutral-200">
      <CardHeader className="border-b border-neutral-200 bg-neutral-50 py-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span>{title}</span>
            {summary && (
              <span className="text-[11px] font-normal text-neutral-500">
                Focos {summary.growth} • Pilares {summary.pillars} • Base {summary.base}
              </span>
            )}
          </div>
          {showEditable ? <Badge variant="default">Editavel</Badge> : <Badge variant="secondary">Somente leitura</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando mapa...
            </div>
          </div>
        )}

        {!data?.orgNode ? (
          <div className="py-10 text-center text-sm text-neutral-500">Selecione um mapa para visualizar.</div>
        ) : (
          <StrategyMapCanvas data={data} compact />
        )}
      </CardContent>
    </Card>
  )
}

function RegionEditor({
  label,
  mapRegion,
  objectives,
  canEdit,
  onCreate,
  onRename,
  onDelete,
  onReorder,
  single,
  busy,
}: {
  label: string
  mapRegion: string
  objectives: StrategicObjective[]
  canEdit: boolean
  onCreate: (mapRegion: string, title: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReorder: (id: string, direction: 'up' | 'down') => Promise<void>
  single: boolean
  busy: boolean
}) {
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  return (
    <div className="rounded-md border border-neutral-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-medium text-neutral-800">{label}</h4>
        <span className="text-xs text-neutral-500">{objectives.length}</span>
      </div>

      <div className="space-y-2">
        {objectives.length === 0 && <p className="text-xs text-neutral-500">Sem objetivos.</p>}
        {objectives.map((objective) => (
          <div key={objective.id} className="rounded-md border border-neutral-200 px-2 py-1.5">
            {editingId === objective.id ? (
              <div className="space-y-2">
                <Input
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && editingTitle.trim()) {
                      void onRename(objective.id, editingTitle.trim()).then(() => {
                        setEditingId(null)
                        setEditingTitle('')
                      })
                    }
                    if (event.key === 'Escape') {
                      setEditingId(null)
                      setEditingTitle('')
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={busy || !editingTitle.trim()}
                    onClick={() => {
                      void onRename(objective.id, editingTitle.trim()).then(() => {
                        setEditingId(null)
                        setEditingTitle('')
                      })
                    }}
                  >
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditingId(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">{objective.title}</p>
                  <p className="text-[11px] text-neutral-500">
                    {objective.perspective?.name || 'Sem perspectiva'} • {objective.status?.name || 'Sem status'}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => onReorder(objective.id, 'up')}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" disabled={busy} onClick={() => onReorder(objective.id, 'down')}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(objective.id)
                        setEditingTitle(objective.title)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600" disabled={busy} onClick={() => onDelete(objective.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {canEdit && (!single || objectives.length === 0) && (
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Novo objetivo..."
            onKeyDown={(event) => {
              if (event.key === 'Enter' && newTitle.trim()) {
                void onCreate(mapRegion, newTitle.trim()).then(() => setNewTitle(''))
              }
            }}
          />
          <Button
            size="sm"
            disabled={busy || !newTitle.trim()}
            onClick={() => {
              void onCreate(mapRegion, newTitle.trim()).then(() => setNewTitle(''))
            }}
          >
            <Plus className="mr-1 h-3 w-3" />
            Adicionar
          </Button>
        </div>
      )}
    </div>
  )
}

export function StrategyBuilding() {
  const [viewableNodes, setViewableNodes] = useState<OrgNode[]>([])
  const [editableNodes, setEditableNodes] = useState<OrgNode[]>([])
  const [leftNodeId, setLeftNodeId] = useState('')
  const [rightNodeId, setRightNodeId] = useState('')
  const [leftMap, setLeftMap] = useState<StrategyMapData | null>(null)
  const [rightMap, setRightMap] = useState<StrategyMapData | null>(null)
  const [loadingLeft, setLoadingLeft] = useState(false)
  const [loadingRight, setLoadingRight] = useState(false)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [mutatingRight, setMutatingRight] = useState(false)

  const rightOptions = useMemo(() => editableNodes, [editableNodes])
  const leftOptions = useMemo(() => viewableNodes, [viewableNodes])

  const loadMap = async (orgNodeId: string, side: 'left' | 'right') => {
    if (!orgNodeId) return

    if (side === 'left') setLoadingLeft(true)
    if (side === 'right') setLoadingRight(true)

    try {
      const response = await fetch(`/api/strategy/map?orgNodeId=${orgNodeId}`)
      if (!response.ok) return
      const payload = await response.json()
      if (side === 'left') setLeftMap(payload)
      if (side === 'right') setRightMap(payload)
    } finally {
      if (side === 'left') setLoadingLeft(false)
      if (side === 'right') setLoadingRight(false)
    }
  }

  const reloadRightMap = async () => {
    if (!rightNodeId) return
    await loadMap(rightNodeId, 'right')
  }

  useEffect(() => {
    const loadScope = async () => {
      const response = await fetch('/api/org/scope')
      if (!response.ok) return
      const payload = await response.json()

      setViewableNodes(payload.viewableNodes || [])
      setEditableNodes(payload.editableNodes || [])

      const initialLeft = payload.activeOrgNodeId || payload.primaryOrgNodeId || payload.viewableNodes?.[0]?.id || ''
      const initialRight = payload.primaryOrgNodeId || payload.editableNodes?.[0]?.id || ''

      setLeftNodeId(initialLeft)
      setRightNodeId(initialRight)

      if (initialLeft) void loadMap(initialLeft, 'left')
      if (initialRight) void loadMap(initialRight, 'right')
    }

    void loadScope()
  }, [])

  const createObjective = async (mapRegion: string, title: string) => {
    if (!rightMap?.orgNode?.id) return
    setMutatingRight(true)
    try {
      await createObjectiveInRegion({ orgNodeId: rightMap.orgNode.id, mapRegion, title })
      await reloadRightMap()
      toast.success('Objetivo criado')
    } catch (error) {
      console.error('Error creating objective in building:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar objetivo')
    } finally {
      setMutatingRight(false)
    }
  }

  const renameObjective = async (id: string, title: string) => {
    setMutatingRight(true)
    try {
      await updateObjectivePartial(id, { title })
      await reloadRightMap()
      toast.success('Objetivo atualizado')
    } catch (error) {
      console.error('Error renaming objective in building:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar objetivo')
    } finally {
      setMutatingRight(false)
    }
  }

  const removeObjective = async (id: string) => {
    setMutatingRight(true)
    try {
      await deleteObjective(id)
      await reloadRightMap()
      toast.success('Objetivo removido')
    } catch (error) {
      console.error('Error deleting objective in building:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao remover objetivo')
    } finally {
      setMutatingRight(false)
    }
  }

  const moveObjective = async (id: string, direction: 'up' | 'down') => {
    setMutatingRight(true)
    try {
      await reorderObjective(id, direction)
      await reloadRightMap()
    } catch (error) {
      console.error('Error reordering objective in building:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao reordenar objetivo')
    } finally {
      setMutatingRight(false)
    }
  }

  const getRegionObjectives = (data: StrategyMapData, key: string): StrategicObjective[] => {
    if (key === 'ambition') return data.regions.ambition ? [data.regions.ambition] : []
    if (key === 'valueProposition') return data.regions.valueProposition ? [data.regions.valueProposition] : []
    return (data.regions as any)[key] || []
  }

  return (
    <div className="relative space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Strategy Building</h1>
        <p className="text-sm text-muted-foreground">
          A esquerda e sempre referencia readonly. A direita e o mapa de trabalho editavel quando permitido.
        </p>
      </div>

      <div className="sticky top-0 z-20 rounded-lg border border-neutral-200 bg-white/95 p-2 backdrop-blur-sm">
        <div className={`grid gap-2 ${leftCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
          {!leftCollapsed && (
            <Select value={leftNodeId} onValueChange={(value) => { setLeftNodeId(value); void loadMap(value, 'left') }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione o mapa de referencia" />
              </SelectTrigger>
              <SelectContent>
                {leftOptions.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.name} ({node.type.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={rightNodeId} onValueChange={(value) => { setRightNodeId(value); void loadMap(value, 'right') }}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Selecione seu mapa editavel" />
            </SelectTrigger>
            <SelectContent>
              {rightOptions.map((node) => (
                <SelectItem key={node.id} value={node.id}>
                  {node.name} ({node.type.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={`grid h-[calc(100vh-220px)] min-h-[560px] gap-3 ${leftCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
        {!leftCollapsed && (
          <div className="relative h-full">
            <StrategyMapPreview
              title="Referencia (esquerda)"
              data={leftMap ? { ...leftMap, isEditAllowed: false } : null}
              loading={loadingLeft}
              forceReadonly
            />
            <button
              type="button"
              onClick={() => setLeftCollapsed(true)}
              className="absolute right-0 top-1/2 hidden h-8 w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:text-neutral-800 lg:flex"
              aria-label="Colapsar referencia"
              title="Colapsar referencia"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="relative h-full">
          {leftCollapsed && (
            <button
              type="button"
              onClick={() => setLeftCollapsed(false)}
              className="absolute left-0 top-1/2 z-10 hidden h-8 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition-colors hover:text-neutral-800 lg:flex"
              aria-label="Mostrar referencia"
              title="Mostrar referencia"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <div className="flex h-full flex-col gap-3">
            <div className="min-h-0 flex-1">
              <StrategyMapPreview title="Seu mapa (direita)" data={rightMap} loading={loadingRight} />
            </div>

            <Card className="border-neutral-200">
              <CardHeader className="border-b border-neutral-200 bg-neutral-50 py-3">
                <CardTitle className="text-sm">Editor de objetivos (direita)</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[320px] space-y-3 overflow-y-auto p-3">
                {!rightMap?.orgNode ? (
                  <p className="text-sm text-neutral-500">Selecione um contexto editavel para comecar.</p>
                ) : !rightMap.isEditAllowed ? (
                  <p className="text-sm text-neutral-500">Voce possui apenas visualizacao para este contexto.</p>
                ) : (
                  REGION_CONFIG.map((region) => (
                    <RegionEditor
                      key={region.mapRegion}
                      label={region.label}
                      mapRegion={region.mapRegion}
                      objectives={getRegionObjectives(rightMap, region.key)}
                      canEdit={rightMap.isEditAllowed}
                      onCreate={createObjective}
                      onRename={renameObjective}
                      onDelete={removeObjective}
                      onReorder={moveObjective}
                      single={region.single}
                      busy={mutatingRight}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
