'use client'

import { useState } from 'react'
import { ArrowUp, ArrowDown, Edit, Trash2, Plus, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type CardStyle = 'default' | 'pillar' | 'base'

interface StrategicObjective {
  id: string
  title: string
  perspective?: { name: string } | null
  status?: { name: string; color?: string | null } | null
}

interface StrategyMapEditableCanvasProps {
  data: {
    meta?: {
      ambitionText?: string | null
      valuePropositionText?: string | null
    } | null
    regions: {
      growthFocus: StrategicObjective[]
      pillarOffer: StrategicObjective[]
      pillarRevenue: StrategicObjective[]
      pillarEfficiency: StrategicObjective[]
      peopleBase: StrategicObjective[]
    }
  }
  editable: boolean
  busy?: boolean
  objectiveKRStatus?: Record<string, boolean>
  selectedObjectiveId?: string | null
  onObjectiveView?: (objective: StrategicObjective) => void
  onCreateObjective?: (mapRegion: string, title: string) => Promise<void>
  onRenameObjective?: (objectiveId: string, title: string) => Promise<void>
  onDeleteObjective?: (objectiveId: string) => Promise<void>
  onReorderObjective?: (objectiveId: string, direction: 'up' | 'down') => Promise<void>
}

function ObjectiveCard({
  objective,
  editable,
  busy,
  style = 'default',
  hasKRs = false,
  isSelected = false,
  onView,
  onRename,
  onDelete,
  onReorder,
}: {
  objective: StrategicObjective
  editable: boolean
  busy?: boolean
  style?: CardStyle
  hasKRs?: boolean
  isSelected?: boolean
  onView?: () => void
  onRename?: (title: string) => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onReorder?: (direction: 'up' | 'down') => Promise<void> | void
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(objective.title)

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
      className={`${getContainerClass()} mb-1 relative ${!editable ? 'cursor-pointer hover:ring-2 hover:ring-[#E87722]' : ''} ${isSelected ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}
      onClick={() => !editable && onView?.()}
    >
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
                onChange={(event) => setTitleValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && titleValue.trim()) {
                    void onRename?.(titleValue.trim())
                    setIsEditingTitle(false)
                  }
                  if (event.key === 'Escape') {
                    setTitleValue(objective.title)
                    setIsEditingTitle(false)
                  }
                }}
                autoFocus
              />
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1 text-xs"
                  disabled={busy || !titleValue.trim()}
                  onClick={() => {
                    void onRename?.(titleValue.trim())
                    setIsEditingTitle(false)
                  }}
                >
                  OK
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1 text-xs"
                  disabled={busy}
                  onClick={() => {
                    setTitleValue(objective.title)
                    setIsEditingTitle(false)
                  }}
                >
                  X
                </Button>
              </div>
            </div>
          ) : (
            <h4
              className={`font-medium text-xs ${editable ? 'cursor-pointer hover:text-[#E87722]' : ''}`}
              onClick={() => {
                if (editable) {
                  setIsEditingTitle(true)
                  setTitleValue(objective.title)
                }
              }}
            >
              {objective.title}
            </h4>
          )}

          <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
            <span>{objective.perspective?.name || 'Sem perspectiva'}</span>
            <span
              className={`px-1 py-0.5 rounded text-[10px] ${objective.status?.color ? '' : 'bg-gray-100'}`}
              style={objective.status?.color ? { backgroundColor: objective.status.color } : {}}
            >
              {objective.status?.name || 'Sem status'}
            </span>
          </div>
        </div>

        {editable && (
          <div className="flex items-center gap-0.5 ml-1">
            <Button variant="ghost" size="sm" onClick={() => void onReorder?.('up')} className="p-0.5 h-5 w-5" disabled={busy}>
              <ArrowUp className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void onReorder?.('down')} className="p-0.5 h-5 w-5" disabled={busy}>
              <ArrowDown className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsEditingTitle(true)} className="p-0.5 h-5 w-5" disabled={busy}>
              <Edit className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void onDelete?.()} className="p-0.5 h-5 w-5 text-red-600" disabled={busy}>
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function StrategyMapEditableCanvas({
  data,
  editable,
  busy = false,
  objectiveKRStatus = {},
  selectedObjectiveId,
  onObjectiveView,
  onCreateObjective,
  onRenameObjective,
  onDeleteObjective,
  onReorderObjective,
}: StrategyMapEditableCanvasProps) {
  const [creatingInRegion, setCreatingInRegion] = useState<string | null>(null)
  const [inlineTitle, setInlineTitle] = useState('')
  const baseLabels = ['Pessoas', 'Cultura', 'Talentos']

  const renderInlineCreate = (regionKey: string, mapRegion: string, placeholder: string) => {
    if (!editable) return null

    if (creatingInRegion === regionKey) {
      return (
        <div className="border border-[#E87722] rounded-md p-4">
          <input
            type="text"
            className="w-full p-2 border rounded text-sm"
            placeholder={placeholder}
            autoFocus
            value={inlineTitle}
            onChange={(event) => setInlineTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && inlineTitle.trim()) {
                void onCreateObjective?.(mapRegion, inlineTitle.trim())
                setInlineTitle('')
                setCreatingInRegion(null)
              } else if (event.key === 'Escape') {
                setInlineTitle('')
                setCreatingInRegion(null)
              }
            }}
          />
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              className="bg-[#E87722] hover:bg-[#d06a1e]"
              disabled={busy || !inlineTitle.trim()}
              onClick={() => {
                void onCreateObjective?.(mapRegion, inlineTitle.trim())
                setInlineTitle('')
                setCreatingInRegion(null)
              }}
            >
              Salvar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setInlineTitle('')
                setCreatingInRegion(null)
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className="text-center py-4">
        <Button variant="outline" size="sm" onClick={() => setCreatingInRegion(regionKey)} disabled={busy}>
          <Plus className="h-3 w-3 mr-1" />
          Adicionar
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="text-center mt-2 mb-2">
        <h2 className="text-sm font-bold text-gray-800">Ambicao Estrategica</h2>
        <p className="text-base text-gray-500 max-w-2xl mx-auto mt-4">
          {data.meta?.ambitionText || 'Texto da ambicao nao definido'}
        </p>
      </div>

      <div className="mb-2">
        <h2 className="text-sm font-semibold mb-2 text-center text-gray-700">Focos de Crescimento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[0, 1, 2].map((index) => {
            const objective = data.regions.growthFocus[index]
            const slot = `GROWTH_FOCUS_${index}`
            return (
              <div key={index} className="bg-white rounded-md border border-[#CFCFCF] p-1.5 shadow-sm">
                {objective ? (
                  <ObjectiveCard
                    objective={objective}
                    editable={editable}
                    busy={busy}
                    style="default"
                    hasKRs={objectiveKRStatus[objective.id] || false}
                    isSelected={selectedObjectiveId === objective.id}
                    onView={() => onObjectiveView?.(objective)}
                    onRename={(title) => onRenameObjective?.(objective.id, title)}
                    onDelete={() => onDeleteObjective?.(objective.id)}
                    onReorder={(direction) => onReorderObjective?.(objective.id, direction)}
                  />
                ) : (
                  renderInlineCreate(slot, 'GROWTH_FOCUS', 'Digite o titulo do foco estrategico...') || (
                    <div className="text-center py-4 text-gray-400">Foco nao definido</div>
                  )
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-2">
        <h2 className="text-sm font-semibold mb-2 text-center text-gray-700">Proposta de Valor</h2>
        <div className="bg-white rounded-lg border border-[#CFCFCF] overflow-hidden shadow-sm">
          <div className="h-[4px] bg-[#E87722]"></div>
          <div className="p-2 text-center">
            <p className="text-lg font-semibold text-gray-700">
              {data.meta?.valuePropositionText || 'Texto da proposta de valor nao definido'}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-2">
        <h2 className="text-sm font-semibold mb-2 text-center text-gray-700">Pilares</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
          {[
            { key: 'pillarOffer', label: 'Oferta', region: 'PILLAR_OFFER' },
            { key: 'pillarRevenue', label: 'Receita', region: 'PILLAR_REVENUE' },
            { key: 'pillarEfficiency', label: 'Eficiencia', region: 'PILLAR_EFFICIENCY' },
          ].map((section) => {
            const objectives = (data.regions as any)[section.key] as StrategicObjective[]
            return (
              <div key={section.key} className="bg-white rounded-lg border border-[#CFCFCF] p-1.5 shadow-sm">
                <h3 className="font-semibold mb-1 text-center text-gray-700 pb-1 border-b border-gray-200">{section.label}</h3>
                <div className="space-y-1">
                  {objectives.map((objective) => (
                    <ObjectiveCard
                      key={objective.id}
                      objective={objective}
                      editable={editable}
                      busy={busy}
                      style="pillar"
                      hasKRs={objectiveKRStatus[objective.id] || false}
                      isSelected={selectedObjectiveId === objective.id}
                      onView={() => onObjectiveView?.(objective)}
                      onRename={(title) => onRenameObjective?.(objective.id, title)}
                      onDelete={() => onDeleteObjective?.(objective.id)}
                      onReorder={(direction) => onReorderObjective?.(objective.id, direction)}
                    />
                  ))}

                  {editable && (
                    creatingInRegion === section.region ? (
                      renderInlineCreate(section.region, section.region, 'Digite o titulo do objetivo...')
                    ) : (
                      <div
                        className="bg-[#F2C7A8] rounded-md p-3 cursor-pointer hover:bg-[#e8b896] transition-colors"
                        onClick={() => setCreatingInRegion(section.region)}
                      >
                        <div className="text-sm text-center text-gray-700">+ Adicionar objetivo</div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-2">
        <h2 className="text-sm font-semibold mb-2 text-center text-gray-700">Base</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[0, 1, 2].map((index) => {
            const objective = data.regions.peopleBase[index]
            const slot = `PEOPLE_BASE_${index}`
            return (
              <div key={index} className="bg-[#DCEFE8] rounded-lg p-1.5">
                <div className="text-center mb-1">
                  <span className="text-xs font-semibold text-gray-700">{baseLabels[index]}</span>
                </div>
                {objective ? (
                  <ObjectiveCard
                    objective={objective}
                    editable={editable}
                    busy={busy}
                    style="base"
                    hasKRs={objectiveKRStatus[objective.id] || false}
                    isSelected={selectedObjectiveId === objective.id}
                    onView={() => onObjectiveView?.(objective)}
                    onRename={(title) => onRenameObjective?.(objective.id, title)}
                    onDelete={() => onDeleteObjective?.(objective.id)}
                    onReorder={(direction) => onReorderObjective?.(objective.id, direction)}
                  />
                ) : (
                  renderInlineCreate(slot, 'PEOPLE_BASE', 'Digite o titulo do objetivo...') || (
                    <div className="text-center py-4 text-gray-500 text-sm">Nao definido</div>
                  )
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
