'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { StrategyMapCanvas } from './strategy-map-canvas'
import { StrategyMapEditableCanvas } from './strategy-map-editable-canvas'
import {
  createObjectiveInRegion,
  deleteObjective,
  reorderObjective,
  updateObjectivePartial,
  upsertStrategyMapMetaForOrgNode,
} from '@/lib/actions/strategy'

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

type MetaField = 'ambitionText' | 'valuePropositionText'

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

function StrategyMapPreview({
  title,
  data,
  loading,
  forceReadonly = false,
  editable = false,
  savingObjectiveId,
  savingRegionKey,
  savingMetaField,
  hasPendingMutation,
  onCreateObjective,
  onRenameObjective,
  onDeleteObjective,
  onReorderObjective,
  onSaveMeta,
}: {
  title: string
  data: StrategyMapData | null
  loading: boolean
  forceReadonly?: boolean
  editable?: boolean
  savingObjectiveId?: string | null
  savingRegionKey?: string | null
  savingMetaField?: MetaField | null
  hasPendingMutation?: boolean
  onCreateObjective?: (mapRegion: string, title: string, regionKey: string) => Promise<boolean>
  onRenameObjective?: (objectiveId: string, title: string) => Promise<boolean>
  onDeleteObjective?: (objectiveId: string) => Promise<boolean>
  onReorderObjective?: (objectiveId: string, direction: 'up' | 'down') => Promise<boolean>
  onSaveMeta?: (field: MetaField, value: string) => Promise<boolean>
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

  const showEditable = editable && data?.isEditAllowed && !forceReadonly

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
        ) : showEditable ? (
          <StrategyMapEditableCanvas
            data={data}
            editable
            savingObjectiveId={savingObjectiveId}
            savingRegionKey={savingRegionKey}
            savingMetaField={savingMetaField}
            hasPendingMutation={hasPendingMutation}
            onCreateObjective={onCreateObjective}
            onRenameObjective={onRenameObjective}
            onDeleteObjective={onDeleteObjective}
            onReorderObjective={onReorderObjective}
            onSaveMeta={onSaveMeta}
          />
        ) : (
          <StrategyMapCanvas data={data} compact />
        )}
      </CardContent>
    </Card>
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
  const [savingObjectiveId, setSavingObjectiveId] = useState<string | null>(null)
  const [savingRegionKey, setSavingRegionKey] = useState<string | null>(null)
  const [savingMetaField, setSavingMetaField] = useState<MetaField | null>(null)

  const hasPendingMutation = Boolean(savingObjectiveId || savingRegionKey || savingMetaField)

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

  const updateRightMap = (updater: (current: StrategyMapData) => StrategyMapData) => {
    setRightMap((current) => (current ? updater(current) : current))
  }

  const mapRegionToKey = (mapRegion: string): keyof StrategyMapData['regions'] | null => {
    if (mapRegion === 'GROWTH_FOCUS') return 'growthFocus'
    if (mapRegion === 'PILLAR_OFFER') return 'pillarOffer'
    if (mapRegion === 'PILLAR_REVENUE') return 'pillarRevenue'
    if (mapRegion === 'PILLAR_EFFICIENCY') return 'pillarEfficiency'
    if (mapRegion === 'PEOPLE_BASE') return 'peopleBase'
    return null
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

  const createObjective = async (mapRegion: string, title: string, regionKey: string): Promise<boolean> => {
    if (!rightMap?.orgNode?.id || hasPendingMutation) return false

    setSavingRegionKey(regionKey)
    try {
      const created = await createObjectiveInRegion({ orgNodeId: rightMap.orgNode.id, mapRegion, title })
      const targetKey = mapRegionToKey(mapRegion)

      if (targetKey) {
        updateRightMap((current) => {
          const normalizedCreated: StrategicObjective = {
            id: created.id,
            title: created.title,
            mapRegion: created.mapRegion,
            orderIndex: created.orderIndex,
            perspective: created.perspective ? { name: created.perspective.name } : null,
            status: created.status ? { name: created.status.name, color: created.status.color } : null,
          }

          const region = [...(current.regions[targetKey] as StrategicObjective[]), normalizedCreated]
          region.sort((a, b) => a.orderIndex - b.orderIndex)
          return {
            ...current,
            regions: {
              ...current.regions,
              [targetKey]: region,
            },
          }
        })
      }

      toast.success('Objetivo criado')
      return true
    } catch (error) {
      console.error('Error creating objective in building:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar objetivo')
      return false
    } finally {
      setSavingRegionKey(null)
    }
  }

  const renameObjective = async (id: string, title: string): Promise<boolean> => {
    if (hasPendingMutation) return false
    const previous = rightMap
    setSavingObjectiveId(id)

    updateRightMap((current) => {
      const updateArray = (items: StrategicObjective[]) => items.map((item) => (item.id === id ? { ...item, title } : item))
      return {
        ...current,
        regions: {
          ...current.regions,
          growthFocus: updateArray(current.regions.growthFocus),
          pillarOffer: updateArray(current.regions.pillarOffer),
          pillarRevenue: updateArray(current.regions.pillarRevenue),
          pillarEfficiency: updateArray(current.regions.pillarEfficiency),
          peopleBase: updateArray(current.regions.peopleBase),
        },
      }
    })

    try {
      await updateObjectivePartial(id, { title })
      toast.success('Objetivo atualizado')
      return true
    } catch (error) {
      console.error('Error renaming objective in building:', error)
      setRightMap(previous)
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar objetivo')
      return false
    } finally {
      setSavingObjectiveId(null)
    }
  }

  const removeObjective = async (id: string): Promise<boolean> => {
    if (hasPendingMutation) return false
    setSavingObjectiveId(id)

    try {
      await deleteObjective(id)
      updateRightMap((current) => {
        const removeFrom = (items: StrategicObjective[]) => items.filter((item) => item.id !== id)
        return {
          ...current,
          regions: {
            ...current.regions,
            growthFocus: removeFrom(current.regions.growthFocus),
            pillarOffer: removeFrom(current.regions.pillarOffer),
            pillarRevenue: removeFrom(current.regions.pillarRevenue),
            pillarEfficiency: removeFrom(current.regions.pillarEfficiency),
            peopleBase: removeFrom(current.regions.peopleBase),
          },
        }
      })
      toast.success('Objetivo removido')
      return true
    } catch (error) {
      console.error('Error deleting objective in building:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao remover objetivo')
      return false
    } finally {
      setSavingObjectiveId(null)
    }
  }

  const moveObjective = async (id: string, direction: 'up' | 'down'): Promise<boolean> => {
    if (hasPendingMutation) return false
    const previous = rightMap
    setSavingObjectiveId(id)

    const swapInRegion = (items: StrategicObjective[]) => {
      const index = items.findIndex((item) => item.id === id)
      if (index === -1) return items
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= items.length) return items

      const cloned = [...items]
      const first = cloned[index]
      const second = cloned[target]
      cloned[index] = { ...second, orderIndex: first.orderIndex }
      cloned[target] = { ...first, orderIndex: second.orderIndex }
      return cloned.sort((a, b) => a.orderIndex - b.orderIndex)
    }

    updateRightMap((current) => ({
      ...current,
      regions: {
        ...current.regions,
        growthFocus: swapInRegion(current.regions.growthFocus),
        pillarOffer: swapInRegion(current.regions.pillarOffer),
        pillarRevenue: swapInRegion(current.regions.pillarRevenue),
        pillarEfficiency: swapInRegion(current.regions.pillarEfficiency),
        peopleBase: swapInRegion(current.regions.peopleBase),
      },
    }))

    try {
      await reorderObjective(id, direction)
      return true
    } catch (error) {
      console.error('Error reordering objective in building:', error)
      setRightMap(previous)
      toast.error(error instanceof Error ? error.message : 'Erro ao reordenar objetivo')
      return false
    } finally {
      setSavingObjectiveId(null)
    }
  }

  const saveMeta = async (field: MetaField, value: string): Promise<boolean> => {
    if (!rightMap?.orgNode?.id || hasPendingMutation) return false

    const previous = rightMap
    setSavingMetaField(field)
    updateRightMap((current) => ({
      ...current,
      meta: {
        ...current.meta,
        [field]: value,
      },
    }))

    try {
      await upsertStrategyMapMetaForOrgNode({ orgNodeId: rightMap.orgNode.id, [field]: value })
      toast.success('Texto salvo com sucesso')
      return true
    } catch (error) {
      console.error('Error saving strategy meta in building:', error)
      setRightMap(previous)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar texto')
      return false
    } finally {
      setSavingMetaField(null)
    }
  }

  return (
    <div className="relative space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Strategy Building</h1>
        <p className="text-sm text-muted-foreground">
          A esquerda e sempre referencia readonly. A direita permite edicao direta no proprio mapa quando permitido.
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

          <StrategyMapPreview
            title="Seu mapa (direita)"
            data={rightMap}
            loading={loadingRight}
            editable
            savingObjectiveId={savingObjectiveId}
            savingRegionKey={savingRegionKey}
            savingMetaField={savingMetaField}
            hasPendingMutation={hasPendingMutation}
            onCreateObjective={createObjective}
            onRenameObjective={renameObjective}
            onDeleteObjective={removeObjective}
            onReorderObjective={moveObjective}
            onSaveMeta={saveMeta}
          />
        </div>
      </div>
    </div>
  )
}
