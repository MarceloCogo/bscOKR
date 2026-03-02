'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { StrategyMapCanvas } from './strategy-map-canvas'

interface OrgNode {
  id: string
  name: string
  type: { name: string }
}

interface StrategyMapData {
  orgNode: OrgNode | null
  isEditAllowed: boolean
  regions: {
    ambition: any | null
    growthFocus: any[]
    valueProposition: any | null
    pillarOffer: any[]
    pillarRevenue: any[]
    pillarEfficiency: any[]
    peopleBase: any[]
  }
}

function StrategyMapPreview({ title, data, loading }: { title: string; data: StrategyMapData | null; loading: boolean }) {
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
          {data?.isEditAllowed ? <Badge variant="default">Editável</Badge> : <Badge variant="secondary">Somente leitura</Badge>}
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

  return (
    <div className="relative space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-foreground">Strategy Building</h1>
        <p className="text-sm text-muted-foreground">
          Compare mapas da sua cadeia hierárquica e construa sua estratégia no contexto editável.
        </p>
      </div>

      <div className="sticky top-0 z-20 rounded-lg border border-neutral-200 bg-white/95 p-2 backdrop-blur-sm">
        <div className={`grid gap-2 ${leftCollapsed ? 'lg:grid-cols-[1fr_auto]' : 'lg:grid-cols-[1fr_1fr_auto]'}`}>
          {!leftCollapsed && (
            <Select value={leftNodeId} onValueChange={(value) => { setLeftNodeId(value); void loadMap(value, 'left') }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione o mapa de referência" />
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
              <SelectValue placeholder="Selecione seu mapa editável" />
            </SelectTrigger>
            <SelectContent>
              {rightOptions.map((node) => (
                <SelectItem key={node.id} value={node.id}>
                  {node.name} ({node.type.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-9" onClick={() => setLeftCollapsed((prev) => !prev)}>
            {leftCollapsed ? (
              <>
                <ChevronRight className="mr-1 h-4 w-4" /> Mostrar referência
              </>
            ) : (
              <>
                <ChevronLeft className="mr-1 h-4 w-4" /> Colapsar referência
              </>
            )}
          </Button>
        </div>
      </div>

      <div className={`grid h-[calc(100vh-220px)] min-h-[560px] gap-3 ${leftCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
        {!leftCollapsed && (
          <div className="h-full">
            <StrategyMapPreview title="Referência (esquerda)" data={leftMap} loading={loadingLeft} />
          </div>
        )}

        <div className="h-full">
          <StrategyMapPreview title="Seu mapa (direita)" data={rightMap} loading={loadingRight} />
        </div>
      </div>
    </div>
  )
}
