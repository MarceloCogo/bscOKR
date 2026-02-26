'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Edit, Trash2, Plus, Settings } from 'lucide-react'
import { getStrategyMap, createObjectiveInRegion, reorderObjective, upsertStrategyMapMeta } from '@/lib/actions/strategy'
import { useRouter } from 'next/navigation'
import { MapHints } from './map-hints'
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
  const [viewedHints, setViewedHints] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    loadMap()
  }, [])

  const loadMap = async () => {
    try {
      const mapData = await getStrategyMap()
      setData(mapData)

      // Load user preferences for viewed hints
      const response = await fetch('/api/user/preferences')
      if (response.ok) {
        const prefs = await response.json()
        setViewedHints(prefs.viewedHints || [])
      }
    } catch (error) {
      console.error('Error loading map:', error)
    } finally {
      setLoading(false)
    }
  }

  const getVisibleHints = () => {
    if (!data) return []

    const hints = []

    // Ambição hint - show if ambition is empty
    if (!data.regions.ambition) {
      hints.push('map.ambition')
    }

    // Growth focus hint - show if less than 3 growth focuses
    if (data.regions.growthFocus.length < 3) {
      hints.push('map.growth_focus')
    }

    // Value proposition hint - show if empty
    if (!data.regions.valueProposition) {
      hints.push('map.value_proposition')
    }

    // Pillars hint - show if any pillar region is empty
    const hasPillars = data.regions.pillarOffer.length > 0 ||
                      data.regions.pillarRevenue.length > 0 ||
                      data.regions.pillarEfficiency.length > 0
    if (!hasPillars) {
      hints.push('map.pillars')
    }

    // People base hint - show if empty
    if (data.regions.peopleBase.length === 0) {
      hints.push('map.people_base')
    }

    return hints.filter(hint => !viewedHints.includes(hint))
  }

  const handleHintViewed = async (hintId: string) => {
    const newViewedHints = [...viewedHints, hintId]
    setViewedHints(newViewedHints)

    // Save to server
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ viewedHints: newViewedHints }),
      })
    } catch (error) {
      console.error('Error saving hint preference:', error)
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

  const handleCreateObjective = async (mapRegion: string) => {
    const title = prompt(`Novo objetivo${mapRegion ? ` para ${mapRegion}` : ''}:`)
    if (!title) return

    let selectedRegion = mapRegion
    if (!selectedRegion) {
      const regions = [
        { value: 'AMBITION', label: 'Ambição Estratégica', disabled: !!data.meta?.ambitionText },
        { value: 'GROWTH_FOCUS', label: 'Focos Estratégicos de Crescimento' },
        { value: 'VALUE_PROPOSITION', label: 'Proposta de Valor', disabled: !!data.meta?.valuePropositionText },
        { value: 'PILLAR_OFFER', label: 'Pilar - Oferta' },
        { value: 'PILLAR_REVENUE', label: 'Pilar - Receita' },
        { value: 'PILLAR_EFFICIENCY', label: 'Pilar - Eficiência' },
        { value: 'PEOPLE_BASE', label: 'Base - Pessoas/Cultura/Talentos' },
      ]

      const regionInput = prompt(
        'Escolha a região:\n' + regions.map(r => `${r.value}: ${r.label}${r.disabled ? ' (já tem texto)' : ''}`).join('\n'),
        'GROWTH_FOCUS'
      )

      if (!regionInput) return

      const region = regions.find(r => r.value === regionInput)
      if (region?.disabled) {
        alert('Esta região já tem texto definido. Edite o texto existente.')
        return
      }

      selectedRegion = regionInput
    }

    try {
      await createObjectiveInRegion({ mapRegion: selectedRegion, title })
      await loadMap()
    } catch (error) {
      console.error('Error creating objective:', error)
      alert('Erro ao criar objetivo')
    }
  }

  const handleEditMeta = async (field: 'ambitionText' | 'valuePropositionText') => {
    const current = data.meta?.[field] || ''
    const newValue = prompt('Editar texto:', current)
    if (newValue === null) return

    try {
      await upsertStrategyMapMeta({ [field]: newValue || undefined })
      await loadMap()
    } catch (error) {
      console.error('Error updating meta:', error)
      alert('Erro ao atualizar')
    }
  }

  const handleReorder = async (objectiveId: string, direction: 'up' | 'down') => {
    try {
      await reorderObjective(objectiveId, direction)
      await loadMap()
    } catch (error) {
      console.error('Error reordering:', error)
    }
  }

  const ObjectiveCard = ({ objective }: { objective: StrategicObjective }) => (
    <Card className="mb-3 cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-sm">{objective.title}</h4>
          {editMode && data.isEditAllowed && (
            <div className="flex space-x-1">
              <Button size="sm" variant="ghost" onClick={() => handleReorder(objective.id, 'up')}>
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => handleReorder(objective.id, 'down')}>
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost">
                <Edit className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="px-2 py-1 border rounded text-xs" style={{ borderColor: objective.status.color || '#6b7280' }}>
            {objective.status.name}
          </span>
          <span>{objective.sponsor.name}</span>
        </div>
      </CardContent>
    </Card>
  )

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
          {editMode && (
            <Button onClick={() => handleCreateObjective('')}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar objetivo
            </Button>
          )}
        </div>
      </div>

      {/* Hints */}
      <MapHints
        visibleHints={getVisibleHints()}
        onHintViewed={handleHintViewed}
      />

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
                  {objective ? (
                    <ObjectiveCard objective={objective} />
                  ) : editMode ? (
                    <div className="text-center py-8">
                      <Button variant="outline" onClick={() => handleCreateObjective('GROWTH_FOCUS')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar foco
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
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
            <div>
              {data.regions.pillarOffer.map((obj: any) => (
                <ObjectiveCard key={obj.id} objective={obj} />
              ))}
              {editMode && (
                <Button variant="outline" className="w-full" onClick={() => handleCreateObjective('PILLAR_OFFER')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar objetivo
                </Button>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-center">Receita</h3>
            <div>
              {data.regions.pillarRevenue.map((obj: any) => (
                <ObjectiveCard key={obj.id} objective={obj} />
              ))}
              {editMode && (
                <Button variant="outline" className="w-full" onClick={() => handleCreateObjective('PILLAR_REVENUE')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar objetivo
                </Button>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-center">Eficiência</h3>
            <div>
              {data.regions.pillarEfficiency.map((obj: any) => (
                <ObjectiveCard key={obj.id} objective={obj} />
              ))}
              {editMode && (
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
                  {objective ? (
                    <ObjectiveCard objective={objective} />
                  ) : editMode ? (
                    <div className="text-center py-4">
                      <Button variant="outline" size="sm" onClick={() => handleCreateObjective('PEOPLE_BASE')}>
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
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
    </div>
  )
}