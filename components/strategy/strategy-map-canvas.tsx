'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, BarChart3, Edit, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface StrategicObjective {
  id: string
  title: string
  mapRegion?: string
  perspective?: { name: string } | null
  status?: { name: string; color?: string | null } | null
}

interface StrategyMapCanvasProps {
  data: {
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
  objectiveKRStatus?: Record<string, boolean>
  selectedObjectiveId?: string | null
  onObjectiveView?: (objective: StrategicObjective) => void
  compact?: boolean
  editable?: boolean
  busy?: boolean
  onCreateObjective?: (mapRegion: string, title: string) => Promise<void> | void
  onRenameObjective?: (objectiveId: string, title: string) => Promise<void> | void
  onDeleteObjective?: (objectiveId: string) => Promise<void> | void
  onReorderObjective?: (objectiveId: string, direction: 'up' | 'down') => Promise<void> | void
}

function ObjectiveCard({
  objective,
  isSelected,
  hasKRs,
  onView,
  style = 'default',
  editable = false,
  busy = false,
  onRename,
  onDelete,
  onReorder,
}: {
  objective: StrategicObjective
  isSelected?: boolean
  hasKRs?: boolean
  onView?: (objective: StrategicObjective) => void
  style?: 'default' | 'pillar' | 'base'
  editable?: boolean
  busy?: boolean
  onRename?: (title: string) => Promise<void> | void
  onDelete?: () => Promise<void> | void
  onReorder?: (direction: 'up' | 'down') => Promise<void> | void
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(objective.title)

  const containerClass =
    style === 'pillar'
      ? 'bg-[#F2C7A8] rounded-md p-2'
      : style === 'base'
        ? 'bg-white/60 rounded-md p-2'
        : 'bg-white border border-gray-200 rounded-md p-2'

  return (
    <div
      className={`${containerClass} mb-1 relative ${editable ? '' : 'cursor-pointer hover:ring-2 hover:ring-[#E87722]'} ${isSelected ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}
      onClick={() => !editable && onView?.(objective)}
    >
      <div className="absolute right-1 top-1 z-10">
        <BarChart3 className={`h-3 w-3 ${hasKRs ? 'text-green-600' : 'text-gray-400'}`} />
      </div>

      <div className="flex items-start justify-between pr-4">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="space-y-1">
              <Input
                value={titleValue}
                onChange={(event) => setTitleValue(event.target.value)}
                className="h-7 text-xs"
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
              className={`text-xs font-medium ${editable ? 'cursor-pointer hover:text-[#E87722]' : ''}`}
              onClick={() => {
                if (editable) {
                  setTitleValue(objective.title)
                  setIsEditingTitle(true)
                }
              }}
            >
              {objective.title}
            </h4>
          )}

          <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
            <span>{objective.perspective?.name || 'Sem perspectiva'}</span>
            <span
              className={`rounded px-1 py-0.5 text-[10px] ${objective.status?.color ? '' : 'bg-gray-100'}`}
              style={objective.status?.color ? { backgroundColor: objective.status.color } : {}}
            >
              {objective.status?.name || 'Sem status'}
            </span>
          </div>
        </div>

        {editable && (
          <div className="ml-1 flex items-center gap-0.5">
            {onReorder && (
              <>
                <Button variant="ghost" size="sm" onClick={() => onReorder?.('up')} className="h-5 w-5 p-0.5" disabled={busy}>
                  <ArrowUp className="h-2.5 w-2.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onReorder?.('down')} className="h-5 w-5 p-0.5" disabled={busy}>
                  <ArrowDown className="h-2.5 w-2.5" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsEditingTitle(true)} className="h-5 w-5 p-0.5" disabled={busy}>
              <Edit className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete?.()} className="h-5 w-5 p-0.5 text-red-600" disabled={busy}>
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function InlineCreate({
  onCreate,
  busy,
  placeholder,
}: {
  onCreate: (title: string) => Promise<void> | void
  busy?: boolean
  placeholder: string
}) {
  const [title, setTitle] = useState('')

  return (
    <div className="rounded-md border border-[#E87722] p-2">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && title.trim()) {
            void onCreate(title.trim())
            setTitle('')
          }
        }}
      />
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          className="bg-[#E87722] hover:bg-[#d06a1e]"
          disabled={busy || !title.trim()}
          onClick={() => {
            void onCreate(title.trim())
            setTitle('')
          }}
        >
          Salvar
        </Button>
      </div>
    </div>
  )
}

export function StrategyMapCanvas({
  data,
  objectiveKRStatus = {},
  selectedObjectiveId,
  onObjectiveView,
  compact = false,
  editable = false,
  busy = false,
  onCreateObjective,
  onRenameObjective,
  onDeleteObjective,
  onReorderObjective,
}: StrategyMapCanvasProps) {
  const baseLabels = ['Pessoas', 'Cultura', 'Talentos']
  const [creatingSlot, setCreatingSlot] = useState<string | null>(null)

  const sectionGap = compact ? 'mb-2' : 'mb-3'
  const regionGap = compact ? 'gap-2' : 'gap-3'

  return (
    <>
      <div className={`${sectionGap} text-center`}>
        <h2 className="text-sm font-bold text-gray-800">Ambicao Estrategica</h2>
        <div className="mx-auto mt-2 max-w-xl">
          {data.regions.ambition ? (
            <div className={`rounded-md border border-[#CFCFCF] bg-white ${compact ? 'p-1.5' : 'p-2'} shadow-sm`}>
              <ObjectiveCard
                objective={data.regions.ambition}
                onView={onObjectiveView}
                isSelected={selectedObjectiveId === data.regions.ambition.id}
                hasKRs={objectiveKRStatus[data.regions.ambition.id] || false}
                style="default"
                editable={editable}
                busy={busy}
                onRename={(title) => onRenameObjective?.(data.regions.ambition!.id, title)}
                onDelete={() => onDeleteObjective?.(data.regions.ambition!.id)}
              />
            </div>
          ) : editable ? (
            creatingSlot === 'AMBITION' ? (
              <InlineCreate
                busy={busy}
                placeholder="Digite a ambição estratégica..."
                onCreate={async (title) => {
                  await onCreateObjective?.('AMBITION', title)
                  setCreatingSlot(null)
                }}
              />
            ) : (
              <div className="py-2 text-center">
                <Button variant="outline" size="sm" onClick={() => setCreatingSlot('AMBITION')} disabled={busy}>
                  <Plus className="mr-1 h-3 w-3" />
                  Definir ambição
                </Button>
              </div>
            )
          ) : (
            <div className="py-2 text-sm text-gray-400">Objetivo de ambição não definido</div>
          )}
        </div>
      </div>

      <div className={sectionGap}>
        <h2 className="mb-1.5 text-center text-sm font-semibold text-gray-700">Focos de Crescimento</h2>
        <div className={`grid grid-cols-1 ${regionGap} md:grid-cols-3`}>
          {[0, 1, 2].map((index) => {
            const objective = data.regions.growthFocus[index]
            const slotKey = `GROWTH_FOCUS_${index}`
            return (
              <div key={index} className={`rounded-md border border-[#CFCFCF] bg-white ${compact ? 'p-1.5' : 'p-2'} shadow-sm`}>
                {objective ? (
                  <ObjectiveCard
                    objective={objective}
                    onView={onObjectiveView}
                    isSelected={selectedObjectiveId === objective.id}
                    hasKRs={objectiveKRStatus[objective.id] || false}
                    style="default"
                    editable={editable}
                    busy={busy}
                    onRename={(title) => onRenameObjective?.(objective.id, title)}
                    onDelete={() => onDeleteObjective?.(objective.id)}
                    onReorder={(direction) => onReorderObjective?.(objective.id, direction)}
                  />
                ) : editable ? (
                  creatingSlot === slotKey ? (
                    <InlineCreate
                      busy={busy}
                      placeholder="Digite o foco estrategico..."
                      onCreate={async (title) => {
                        await onCreateObjective?.('GROWTH_FOCUS', title)
                        setCreatingSlot(null)
                      }}
                    />
                  ) : (
                    <div className="py-3 text-center">
                      <Button variant="outline" size="sm" onClick={() => setCreatingSlot(slotKey)} disabled={busy}>
                        <Plus className="mr-1 h-3 w-3" />
                        Adicionar foco
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="py-4 text-center text-gray-400">Foco não definido</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className={sectionGap}>
        <h2 className="mb-1.5 text-center text-sm font-semibold text-gray-700">Proposta de Valor</h2>
        <div className="overflow-hidden rounded-lg border border-[#CFCFCF] bg-white shadow-sm">
          <div className="h-[4px] bg-[#E87722]" />
          <div className={`${compact ? 'p-2' : 'p-3'} text-center`}>
            <p className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-gray-700`}>
              {data.meta?.valuePropositionText || 'Texto da proposta de valor não definido'}
            </p>
          </div>
        </div>
      </div>

      <div className={sectionGap}>
        <h2 className="mb-1.5 text-center text-sm font-semibold text-gray-700">Pilares</h2>
        <div className={`grid grid-cols-1 ${regionGap} lg:grid-cols-3`}>
          {[
            { key: 'pillarOffer', label: 'Oferta', region: 'PILLAR_OFFER' },
            { key: 'pillarRevenue', label: 'Receita', region: 'PILLAR_REVENUE' },
            { key: 'pillarEfficiency', label: 'Eficiencia', region: 'PILLAR_EFFICIENCY' },
          ].map((pillar) => {
            const objectives = (data.regions as any)[pillar.key] as StrategicObjective[]
            const slotKey = pillar.region
            return (
              <div key={pillar.key} className={`rounded-lg border border-[#CFCFCF] bg-white ${compact ? 'p-1.5' : 'p-2'} shadow-sm`}>
                <h3 className={`border-b border-gray-200 text-center font-semibold text-gray-700 ${compact ? 'mb-0.5 pb-0.5 text-xs' : 'mb-1 pb-1'}`}>{pillar.label}</h3>
                <div className="space-y-1">
                  {objectives.length > 0 ? (
                    objectives.map((objective) => (
                      <ObjectiveCard
                        key={objective.id}
                        objective={objective}
                        onView={onObjectiveView}
                        isSelected={selectedObjectiveId === objective.id}
                        hasKRs={objectiveKRStatus[objective.id] || false}
                        style="pillar"
                        editable={editable}
                        busy={busy}
                        onRename={(title) => onRenameObjective?.(objective.id, title)}
                        onDelete={() => onDeleteObjective?.(objective.id)}
                        onReorder={(direction) => onReorderObjective?.(objective.id, direction)}
                      />
                    ))
                  ) : (
                    <div className="py-3 text-center text-gray-400">Sem objetivos</div>
                  )}

                  {editable && (
                    creatingSlot === slotKey ? (
                      <InlineCreate
                        busy={busy}
                        placeholder="Digite o objetivo..."
                        onCreate={async (title) => {
                          await onCreateObjective?.(pillar.region, title)
                          setCreatingSlot(null)
                        }}
                      />
                    ) : (
                      <div className="rounded-md bg-[#F2C7A8] p-2 text-center">
                        <Button variant="ghost" size="sm" onClick={() => setCreatingSlot(slotKey)} disabled={busy}>
                          <Plus className="mr-1 h-3 w-3" />
                          Adicionar objetivo
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={sectionGap}>
        <h2 className="mb-1.5 text-center text-sm font-semibold text-gray-700">Base</h2>
        <div className={`grid grid-cols-1 ${regionGap} md:grid-cols-3`}>
          {[0, 1, 2].map((index) => {
            const objective = data.regions.peopleBase[index]
            const slotKey = `PEOPLE_BASE_${index}`
            return (
              <div key={index} className={`rounded-lg bg-[#DCEFE8] ${compact ? 'p-1.5' : 'p-2'}`}>
                <div className={`${compact ? 'mb-0.5' : 'mb-1'} text-center`}>
                  <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-gray-700`}>{baseLabels[index]}</span>
                </div>
                {objective ? (
                  <ObjectiveCard
                    objective={objective}
                    onView={onObjectiveView}
                    isSelected={selectedObjectiveId === objective.id}
                    hasKRs={objectiveKRStatus[objective.id] || false}
                    style="base"
                    editable={editable}
                    busy={busy}
                    onRename={(title) => onRenameObjective?.(objective.id, title)}
                    onDelete={() => onDeleteObjective?.(objective.id)}
                    onReorder={(direction) => onReorderObjective?.(objective.id, direction)}
                  />
                ) : editable ? (
                  creatingSlot === slotKey ? (
                    <InlineCreate
                      busy={busy}
                      placeholder="Digite o objetivo..."
                      onCreate={async (title) => {
                        await onCreateObjective?.('PEOPLE_BASE', title)
                        setCreatingSlot(null)
                      }}
                    />
                  ) : (
                    <div className="py-3 text-center">
                      <Button variant="outline" size="sm" className="bg-white" onClick={() => setCreatingSlot(slotKey)} disabled={busy}>
                        <Plus className="mr-1 h-3 w-3" />
                        Adicionar
                      </Button>
                    </div>
                  )
                ) : (
                  <div className="py-3 text-center text-sm text-gray-500">Não definido</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
