'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, BarChart3, Edit, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type CardStyle = 'default' | 'pillar' | 'base'
type MetaField = 'ambitionText' | 'valuePropositionText'

interface StrategicObjective {
  id: string
  title: string
  mapRegion: string
  orderIndex: number
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
  objectiveKRStatus?: Record<string, boolean>
  selectedObjectiveId?: string | null
  savingObjectiveId?: string | null
  savingRegionKey?: string | null
  savingMetaField?: MetaField | null
  hasPendingMutation?: boolean
  onObjectiveView?: (objective: StrategicObjective) => void
  onCreateObjective?: (mapRegion: string, title: string, regionKey: string) => Promise<boolean>
  onRenameObjective?: (objectiveId: string, title: string) => Promise<boolean>
  onDeleteObjective?: (objectiveId: string) => Promise<boolean>
  onReorderObjective?: (objectiveId: string, direction: 'up' | 'down') => Promise<boolean>
  onSaveMeta?: (field: MetaField, value: string) => Promise<boolean>
}

function EditableMetaBlock({
  field,
  value,
  editable,
  isSaving,
  isBlocked,
  placeholder,
  textClassName,
  onSave,
}: {
  field: MetaField
  value?: string | null
  editable: boolean
  isSaving: boolean
  isBlocked: boolean
  placeholder: string
  textClassName: string
  onSave?: (field: MetaField, value: string) => Promise<boolean>
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value || '')

  if (!editable) {
    return <p className={textClassName}>{value || placeholder}</p>
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <textarea
          className="w-full rounded-md border p-3 text-sm"
          rows={4}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isSaving}
          autoFocus
        />
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={isSaving}
            className="bg-[#E87722] hover:bg-[#d06a1e]"
            onClick={async () => {
              const ok = await onSave?.(field, draft)
              if (ok) {
                setIsEditing(false)
              }
            }}
          >
            {isSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isSaving}
            onClick={() => {
              setDraft(value || '')
              setIsEditing(false)
            }}
          >
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="w-full rounded-md p-2 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isBlocked}
      onClick={() => {
        setDraft(value || '')
        setIsEditing(true)
      }}
    >
      <p className={textClassName}>{value || placeholder}</p>
    </button>
  )
}

function ObjectiveCard({
  objective,
  editable,
  style = 'default',
  hasKRs = false,
  isSelected = false,
  isSaving = false,
  disabled = false,
  onView,
  onRename,
  onDelete,
  onReorder,
}: {
  objective: StrategicObjective
  editable: boolean
  style?: CardStyle
  hasKRs?: boolean
  isSelected?: boolean
  isSaving?: boolean
  disabled?: boolean
  onView?: () => void
  onRename?: (title: string) => Promise<boolean> | boolean | void
  onDelete?: () => Promise<boolean> | boolean | void
  onReorder?: (direction: 'up' | 'down') => Promise<boolean> | boolean | void
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
      className={`${getContainerClass()} mb-1 relative transition-opacity ${(isSaving || disabled) ? 'opacity-70' : ''} ${!editable ? 'cursor-pointer hover:ring-2 hover:ring-[#E87722]' : ''} ${isSelected ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}
      onClick={() => !editable && onView?.()}
    >
      <div className="absolute right-1 top-1 z-10 flex items-center gap-1">
        {isSaving ? <Loader2 className="h-3 w-3 animate-spin text-[#E87722]" /> : null}
        <BarChart3 className={`h-3 w-3 ${hasKRs ? 'text-green-600' : 'text-gray-400'}`} />
      </div>

      <div className="flex items-start justify-between pr-6">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="space-y-1">
              <input
                type="text"
                className="w-full rounded border p-1 text-xs"
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
                disabled={isSaving || disabled || !titleValue.trim()}
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
                disabled={isSaving || disabled}
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
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0.5" disabled={isSaving || disabled} onClick={() => void onReorder?.('up')}>
              <ArrowUp className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0.5" disabled={isSaving || disabled} onClick={() => void onReorder?.('down')}>
              <ArrowDown className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0.5" disabled={isSaving || disabled} onClick={() => setIsEditingTitle(true)}>
              <Edit className="h-2.5 w-2.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0.5 text-red-600" disabled={isSaving || disabled} onClick={() => void onDelete?.()}>
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
  objectiveKRStatus = {},
  selectedObjectiveId,
  savingObjectiveId,
  savingRegionKey,
  savingMetaField,
  hasPendingMutation = false,
  onObjectiveView,
  onCreateObjective,
  onRenameObjective,
  onDeleteObjective,
  onReorderObjective,
  onSaveMeta,
}: StrategyMapEditableCanvasProps) {
  const [creatingInRegion, setCreatingInRegion] = useState<string | null>(null)
  const [inlineTitle, setInlineTitle] = useState('')
  const baseLabels = ['Pessoas', 'Cultura', 'Talentos']

  const renderInlineCreate = (regionKey: string, mapRegion: string, placeholder: string) => {
    if (!editable) return null

    const isSavingThisRegion = savingRegionKey === regionKey

    if (creatingInRegion === regionKey) {
      return (
        <div className={`rounded-md border border-[#E87722] p-4 transition ${isSavingThisRegion ? 'animate-pulse bg-orange-50' : ''}`}>
          <input
            type="text"
            className="w-full rounded border p-2 text-sm"
            placeholder={placeholder}
            autoFocus
            value={inlineTitle}
            onChange={(event) => setInlineTitle(event.target.value)}
            disabled={isSavingThisRegion || hasPendingMutation}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && inlineTitle.trim() && !isSavingThisRegion && !hasPendingMutation) {
                event.preventDefault()
                void (async () => {
                  const ok = await onCreateObjective?.(mapRegion, inlineTitle.trim(), regionKey)
                  if (ok) {
                    setInlineTitle('')
                    setCreatingInRegion(null)
                  }
                })()
              } else if (event.key === 'Escape') {
                setInlineTitle('')
                setCreatingInRegion(null)
              }
            }}
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              className="bg-[#E87722] hover:bg-[#d06a1e]"
              disabled={isSavingThisRegion || hasPendingMutation || !inlineTitle.trim()}
              onClick={async () => {
                const ok = await onCreateObjective?.(mapRegion, inlineTitle.trim(), regionKey)
                if (ok) {
                  setInlineTitle('')
                  setCreatingInRegion(null)
                }
              }}
            >
              {isSavingThisRegion ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
              {isSavingThisRegion ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isSavingThisRegion || hasPendingMutation}
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
      <div className="py-4 text-center">
        <Button variant="outline" size="sm" onClick={() => setCreatingInRegion(regionKey)} disabled={Boolean(savingRegionKey) || hasPendingMutation}>
          <Plus className="mr-1 h-3 w-3" />
          Adicionar
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="mt-2 mb-2 text-center">
        <h2 className="text-sm font-bold text-gray-800">Ambicao Estrategica</h2>
        <div className="mx-auto mt-2 max-w-2xl rounded-md border border-gray-200 bg-white p-2">
          <EditableMetaBlock
            field="ambitionText"
            value={data.meta?.ambitionText}
            editable={editable}
            isSaving={savingMetaField === 'ambitionText'}
            isBlocked={hasPendingMutation && savingMetaField !== 'ambitionText'}
            placeholder="Clique para editar a ambicao estrategica..."
            textClassName="text-base text-gray-600"
            onSave={onSaveMeta}
          />
        </div>
      </div>

      <div className="mb-2">
        <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Focos de Crescimento</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const objective = data.regions.growthFocus[index]
            const slotKey = `GROWTH_FOCUS_${index}`
            return (
              <div key={index} className="rounded-md border border-[#CFCFCF] bg-white p-1.5 shadow-sm">
                {objective ? (
                  <ObjectiveCard
                    objective={objective}
                    editable={editable}
                    style="default"
                    isSaving={savingObjectiveId === objective.id}
                    disabled={hasPendingMutation && savingObjectiveId !== objective.id}
                    hasKRs={objectiveKRStatus[objective.id] || false}
                    isSelected={selectedObjectiveId === objective.id}
                    onView={() => onObjectiveView?.(objective)}
                    onRename={(title) => onRenameObjective?.(objective.id, title)}
                    onDelete={() => onDeleteObjective?.(objective.id)}
                    onReorder={(direction) => onReorderObjective?.(objective.id, direction)}
                  />
                ) : (
                  renderInlineCreate(slotKey, 'GROWTH_FOCUS', 'Digite o titulo do foco estrategico...') || (
                    <div className="py-4 text-center text-gray-400">Foco nao definido</div>
                  )
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-2">
        <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Proposta de Valor</h2>
        <div className="overflow-hidden rounded-lg border border-[#CFCFCF] bg-white shadow-sm">
          <div className="h-[4px] bg-[#E87722]" />
          <div className="p-2 text-center">
            <EditableMetaBlock
              field="valuePropositionText"
              value={data.meta?.valuePropositionText}
              editable={editable}
              isSaving={savingMetaField === 'valuePropositionText'}
              isBlocked={hasPendingMutation && savingMetaField !== 'valuePropositionText'}
              placeholder="Clique para editar a proposta de valor..."
              textClassName="text-lg font-semibold text-gray-700"
              onSave={onSaveMeta}
            />
          </div>
        </div>
      </div>

      <div className="mb-2">
        <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Pilares</h2>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
          {[
            { key: 'pillarOffer', label: 'Oferta', mapRegion: 'PILLAR_OFFER' },
            { key: 'pillarRevenue', label: 'Receita', mapRegion: 'PILLAR_REVENUE' },
            { key: 'pillarEfficiency', label: 'Eficiencia', mapRegion: 'PILLAR_EFFICIENCY' },
          ].map((section) => {
            const objectives = (data.regions as any)[section.key] as StrategicObjective[]
            return (
              <div key={section.key} className="rounded-lg border border-[#CFCFCF] bg-white p-1.5 shadow-sm">
                <h3 className="mb-1 border-b border-gray-200 pb-1 text-center font-semibold text-gray-700">{section.label}</h3>
                <div className="space-y-1">
                  {objectives.map((objective) => (
                    <ObjectiveCard
                      key={objective.id}
                      objective={objective}
                      editable={editable}
                      style="pillar"
                      isSaving={savingObjectiveId === objective.id}
                      disabled={hasPendingMutation && savingObjectiveId !== objective.id}
                      hasKRs={objectiveKRStatus[objective.id] || false}
                      isSelected={selectedObjectiveId === objective.id}
                      onView={() => onObjectiveView?.(objective)}
                      onRename={(title) => onRenameObjective?.(objective.id, title)}
                      onDelete={() => onDeleteObjective?.(objective.id)}
                      onReorder={(direction) => onReorderObjective?.(objective.id, direction)}
                    />
                  ))}
                  {editable && (
                    creatingInRegion === section.mapRegion ? (
                      renderInlineCreate(section.mapRegion, section.mapRegion, 'Digite o titulo do objetivo...')
                    ) : (
                      <div
                        className="cursor-pointer rounded-md bg-[#F2C7A8] p-3 transition-colors hover:bg-[#e8b896]"
                        onClick={() => setCreatingInRegion(section.mapRegion)}
                      >
                        <div className="text-center text-sm text-gray-700">+ Adicionar objetivo</div>
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
        <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Base</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const objective = data.regions.peopleBase[index]
            const slotKey = `PEOPLE_BASE_${index}`
            const baseLabels = ['Pessoas', 'Cultura', 'Talentos']
            return (
              <div key={index} className="rounded-lg bg-[#DCEFE8] p-1.5">
                <div className="mb-1 text-center">
                  <span className="text-xs font-semibold text-gray-700">{baseLabels[index]}</span>
                </div>
                {objective ? (
                  <ObjectiveCard
                    objective={objective}
                    editable={editable}
                      style="base"
                      isSaving={savingObjectiveId === objective.id}
                      disabled={hasPendingMutation && savingObjectiveId !== objective.id}
                      hasKRs={objectiveKRStatus[objective.id] || false}
                    isSelected={selectedObjectiveId === objective.id}
                    onView={() => onObjectiveView?.(objective)}
                    onRename={(title) => onRenameObjective?.(objective.id, title)}
                    onDelete={() => onDeleteObjective?.(objective.id)}
                    onReorder={(direction) => onReorderObjective?.(objective.id, direction)}
                  />
                ) : (
                  renderInlineCreate(slotKey, 'PEOPLE_BASE', 'Digite o titulo do objetivo...') || (
                    <div className="py-4 text-center text-sm text-gray-500">Nao definido</div>
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
