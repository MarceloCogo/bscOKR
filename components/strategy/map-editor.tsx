'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Edit, Trash2, Plus, Settings } from 'lucide-react'
import { getStrategyMap, createObjectiveInRegion, reorderObjective, upsertStrategyMapMeta } from '@/lib/actions/strategy'
import { useRouter } from 'next/navigation'
import { ObjectiveFormDialog } from './objective-form-dialog'

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
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [showObjectiveDialog, setShowObjectiveDialog] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadMap()
  }, [])

  const loadMap = async () => {
    try {
      const mapData = await getStrategyMap()
      setData(mapData)

      // Load required data for objective creation
      const [perspectivesRes, pillarsRes, statusesRes, usersRes] = await Promise.all([
        fetch('/api/config/perspectives'),
        fetch('/api/config/pillars'),
        fetch('/api/config/objective-statuses'),
        fetch('/api/users'),
      ])

      if (perspectivesRes.ok) setPerspectives(await perspectivesRes.json())
      if (pillarsRes.ok) setPillars(await pillarsRes.json())
      if (statusesRes.ok) setStatuses(await statusesRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
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
              disabled={!data.isEditAllowed}
            >
              Editar mapa
            </Button>
          </div>
        </div>
      </div>

      {/* Ambição Estratégica */}
      <div className="text-center mb-12">
        <h2 className="text-xl font-semibold mb-4">Ambição Estratégica</h2>
        {editMode ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <p className="text-lg mb-4">{data.meta?.ambitionText || 'Clique para editar...'}</p>
              <Button onClick={() => handleEditMeta('ambitionText')}>
                <Edit className="h-4 w-4 mr-2" />
                Editar texto
              </Button>
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
                  <ObjectiveCard objective={objective} />
                  {!objective && editMode && (
                    <div className="text-center py-4">
                      <Button variant="outline" onClick={() => handleCreateObjective('GROWTH_FOCUS')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar foco
                      </Button>
                    </div>
                  )}
                  {!objective && !editMode && (
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
                <p className="text-lg mb-4">{data.meta?.valuePropositionText || 'Clique para editar...'}</p>
                <Button onClick={() => handleEditMeta('valuePropositionText')}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar texto
                </Button>
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
            <div className="space-y-2">
              {data.regions.pillarOffer.map((obj: any) => (
                <ObjectiveCard key={obj.id} objective={obj} />
              ))}
              {data.regions.pillarOffer.length === 0 && editMode && (
                <Button variant="outline" className="w-full" onClick={() => handleCreateObjective('PILLAR_OFFER')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar objetivo
                </Button>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-center">Receita</h3>
            <div className="space-y-2">
              {data.regions.pillarRevenue.map((obj: any) => (
                <ObjectiveCard key={obj.id} objective={obj} />
              ))}
              {data.regions.pillarRevenue.length === 0 && editMode && (
                <Button variant="outline" className="w-full" onClick={() => handleCreateObjective('PILLAR_REVENUE')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar objetivo
                </Button>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-center">Eficiência</h3>
            <div className="space-y-2">
              {data.regions.pillarEfficiency.map((obj: any) => (
                <ObjectiveCard key={obj.id} objective={obj} />
              ))}
              {data.regions.pillarEfficiency.length === 0 && editMode && (
                <Button variant="outline" className="w-full" onClick={() => handleCreateObjective('PILLAR_EFFICIENCY')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar objetivo
                </Button>
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
                  <ObjectiveCard objective={objective} />
                  {!objective && editMode && (
                    <div className="text-center py-4">
                      <Button variant="outline" size="sm" onClick={() => handleCreateObjective('PEOPLE_BASE')}>
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  )}
                  {!objective && !editMode && (
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
    </div>
  )
}

function ObjectiveCard({ objective }: { objective: any }) {
  if (!objective) return null

  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        <h4 className="font-medium text-sm">{objective.title}</h4>
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>{objective.perspective.name}</span>
          <span className={`px-2 py-1 rounded text-xs ${objective.status.color ? '' : 'bg-gray-100'}`}
                style={objective.status.color ? { backgroundColor: objective.status.color } : {}}>
            {objective.status.name}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function handleEditMeta(field: string) {
  // TODO: Implement meta editing
  alert('Edição de meta será implementada')
}