'use client'

import { BarChart3 } from 'lucide-react'

interface StrategicObjective {
  id: string
  title: string
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
}

function ReadOnlyObjectiveCard({
  objective,
  isSelected,
  hasKRs,
  onView,
  style = 'default',
}: {
  objective: StrategicObjective
  isSelected?: boolean
  hasKRs?: boolean
  onView?: (objective: StrategicObjective) => void
  style?: 'default' | 'pillar' | 'base'
}) {
  const containerClass =
    style === 'pillar'
      ? 'bg-[#F2C7A8] rounded-md p-2'
      : style === 'base'
        ? 'bg-white/60 rounded-md p-2'
        : 'bg-white border border-gray-200 rounded-md p-2'

  return (
    <div
      className={`${containerClass} mb-1 relative cursor-pointer hover:ring-2 hover:ring-[#E87722] ${isSelected ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}
      onClick={() => onView?.(objective)}
    >
      <div className="absolute right-1 top-1 z-10">
        <BarChart3 className={`h-3 w-3 ${hasKRs ? 'text-green-600' : 'text-gray-400'}`} />
      </div>

      <div className="pr-4">
        <h4 className="text-xs font-medium leading-tight">{objective.title}</h4>
        <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
          <span>{objective.perspective?.name || 'Sem perspectiva'}</span>
          <span className={`rounded px-1 py-0.5 text-[10px] ${objective.status?.color ? '' : 'bg-gray-100'}`} style={objective.status?.color ? { backgroundColor: objective.status.color } : {}}>
            {objective.status?.name || 'Sem status'}
          </span>
        </div>
      </div>
    </div>
  )
}

export function StrategyMapCanvas({ data, objectiveKRStatus = {}, selectedObjectiveId, onObjectiveView, compact = false }: StrategyMapCanvasProps) {
  const baseLabels = ['Pessoas', 'Cultura', 'Talentos']

  const sectionGap = compact ? 'mb-2' : 'mb-3'
  const regionGap = compact ? 'gap-2' : 'gap-3'
  const textMain = compact ? 'text-base' : 'text-lg'

  return (
    <>
      <div className={`${sectionGap} text-center`}>
        <h2 className="text-sm font-bold text-gray-800">Ambição Estratégica</h2>
        <p className={`mx-auto mt-2 max-w-2xl ${textMain} text-gray-500`}>
          {data.meta?.ambitionText || 'Texto da ambição não definido'}
        </p>
      </div>

      <div className={sectionGap}>
        <h2 className="mb-1.5 text-center text-sm font-semibold text-gray-700">Focos de Crescimento</h2>
        <div className={`grid grid-cols-1 ${regionGap} md:grid-cols-3`}>
          {[0, 1, 2].map((index) => {
            const objective = data.regions.growthFocus[index]
            return (
              <div key={index} className={`rounded-md border border-[#CFCFCF] bg-white ${compact ? 'p-1.5' : 'p-2'} shadow-sm`}>
                {objective ? (
                  <ReadOnlyObjectiveCard
                    objective={objective}
                    onView={onObjectiveView}
                    isSelected={selectedObjectiveId === objective.id}
                    hasKRs={objectiveKRStatus[objective.id] || false}
                    style="default"
                  />
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
            { key: 'pillarOffer', label: 'Oferta' },
            { key: 'pillarRevenue', label: 'Receita' },
            { key: 'pillarEfficiency', label: 'Eficiência' },
          ].map((pillar) => {
            const objectives = (data.regions as any)[pillar.key] as StrategicObjective[]
            return (
              <div key={pillar.key} className={`rounded-lg border border-[#CFCFCF] bg-white ${compact ? 'p-1.5' : 'p-2'} shadow-sm`}>
                <h3 className={`border-b border-gray-200 text-center font-semibold text-gray-700 ${compact ? 'mb-0.5 pb-0.5 text-xs' : 'mb-1 pb-1'}`}>{pillar.label}</h3>
                <div className="space-y-1">
                  {objectives.length > 0 ? (
                    objectives.map((objective) => (
                      <ReadOnlyObjectiveCard
                        key={objective.id}
                        objective={objective}
                        onView={onObjectiveView}
                        isSelected={selectedObjectiveId === objective.id}
                        hasKRs={objectiveKRStatus[objective.id] || false}
                        style="pillar"
                      />
                    ))
                  ) : (
                    <div className="py-3 text-center text-gray-400">Sem objetivos</div>
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
            return (
              <div key={index} className={`rounded-lg bg-[#DCEFE8] ${compact ? 'p-1.5' : 'p-2'}`}>
                <div className={`${compact ? 'mb-0.5' : 'mb-1'} text-center`}>
                  <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-gray-700`}>{baseLabels[index]}</span>
                </div>
                {objective ? (
                  <ReadOnlyObjectiveCard
                    objective={objective}
                    onView={onObjectiveView}
                    isSelected={selectedObjectiveId === objective.id}
                    hasKRs={objectiveKRStatus[objective.id] || false}
                    style="base"
                  />
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
