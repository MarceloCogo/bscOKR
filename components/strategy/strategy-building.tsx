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
  return (
    <Card className="h-full border-neutral-200">
      <CardHeader className="border-b border-neutral-200 bg-neutral-50">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>{title}</span>
          {data?.isEditAllowed ? <Badge variant="default">Editável</Badge> : <Badge variant="secondary">Somente leitura</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative p-4">
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
          <StrategyMapCanvas data={data} />
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
    <div className="relative space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Strategy Building</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare mapas da sua cadeia hierárquica e construa sua estratégia no contexto editável.
        </p>
      </div>

      {!leftCollapsed && (
        <div className="absolute left-0 top-[88px] z-20 hidden lg:block">
          <Button
            variant="outline"
            size="sm"
            className="rounded-r-md rounded-l-none border-l-0 bg-white"
            onClick={() => setLeftCollapsed(true)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Colapsar referência
          </Button>
        </div>
      )}

      {leftCollapsed && (
        <div className="absolute left-0 top-[88px] z-20 hidden lg:block">
          <Button
            variant="outline"
            size="sm"
            className="rounded-r-md rounded-l-none border-l-0 bg-white"
            onClick={() => setLeftCollapsed(false)}
          >
            <ChevronRight className="mr-1 h-4 w-4" />
            Mostrar referência
          </Button>
        </div>
      )}

      <div className={`grid gap-4 ${leftCollapsed ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
        {!leftCollapsed && (
          <div className="space-y-3">
          <Select value={leftNodeId} onValueChange={(value) => { setLeftNodeId(value); void loadMap(value, 'left') }}>
            <SelectTrigger>
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
          <StrategyMapPreview title="Referência (esquerda)" data={leftMap} loading={loadingLeft} />
          </div>
        )}

        <div className="space-y-3">
          <Select value={rightNodeId} onValueChange={(value) => { setRightNodeId(value); void loadMap(value, 'right') }}>
            <SelectTrigger>
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
          <StrategyMapPreview title="Seu mapa (direita)" data={rightMap} loading={loadingRight} />
        </div>
      </div>
    </div>
  )
}
