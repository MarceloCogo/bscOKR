'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
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

function StrategyMapPreview({
  title,
  data,
  loading,
  forceReadonly = false,
  editable = false,
  busy = false,
  onCreateObjective,
  onRenameObjective,
  onDeleteObjective,
  onReorderObjective,
}: {
  title: string
  data: StrategyMapData | null
  loading: boolean
  forceReadonly?: boolean
  editable?: boolean
  busy?: boolean
  onCreateObjective?: (mapRegion: string, title: string) => Promise<void>
  onRenameObjective?: (objectiveId: string, title: string) => Promise<void>
  onDeleteObjective?: (objectiveId: string) => Promise<void>
  onReorderObjective?: (objectiveId: string, direction: 'up' | 'down') => Promise<void>
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
        ) : (
          <StrategyMapCanvas
            data={data}
            compact={!showEditable}
            editable={showEditable}
            busy={busy}
            onCreateObjective={onCreateObjective}
            onRenameObjective={onRenameObjective}
            onDeleteObjective={onDeleteObjective}
            onReorderObjective={onReorderObjective}
          />
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
            busy={mutatingRight}
            onCreateObjective={createObjective}
            onRenameObjective={renameObjective}
            onDeleteObjective={removeObjective}
            onReorderObjective={moveObjective}
          />
        </div>
      </div>
    </div>
  )
}
