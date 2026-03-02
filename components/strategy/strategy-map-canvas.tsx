'use client'

import { Card, CardContent } from '@/components/ui/card'

interface StrategicObjective {
  id: string
  title: string
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
}

function ReadOnlyObjectiveCard({
  objective,
  isSelected,
  hasKRs,
  onView,
}: {
  objective: StrategicObjective
  isSelected?: boolean
  hasKRs?: boolean
  onView?: (objective: StrategicObjective) => void
}) {
  return (
    <Card
      className={`cursor-pointer border transition-colors hover:border-[#E87722] ${isSelected ? 'ring-2 ring-[#E87722]' : ''}`}
      onClick={() => onView?.(objective)}
    >
      <CardContent className="p-2">
        <p className="text-xs font-medium text-gray-800">{objective.title}</p>
        <div className="mt-1 flex items-center justify-between">
          {objective.status ? (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] text-white"
              style={{ backgroundColor: objective.status.color || '#6b7280' }}
            >
              {objective.status.name}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">Sem status</span>
          )}
          {hasKRs && <span className="text-[10px] text-[#E87722]">Com KRs</span>}
        </div>
      </CardContent>
    </Card>
  )
}

export function StrategyMapCanvas({ data, objectiveKRStatus = {}, selectedObjectiveId, onObjectiveView }: StrategyMapCanvasProps) {
  const baseLabels = ['Pessoas', 'Cultura', 'Talentos']

  return (
    <>
      <div className="mb-2 text-center">
        <h2 className="text-sm font-bold text-gray-800">Ambição Estratégica</h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-gray-500">
          {data.meta?.ambitionText || 'Texto da ambição não definido'}
        </p>
      </div>

      <div className="mb-2">
        <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Focos de Crescimento</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const objective = data.regions.growthFocus[index]
            return (
              <div key={index} className="rounded-md border border-[#CFCFCF] bg-white p-1.5 shadow-sm">
                {objective ? (
                  <ReadOnlyObjectiveCard
                    objective={objective}
                    onView={onObjectiveView}
                    isSelected={selectedObjectiveId === objective.id}
                    hasKRs={objectiveKRStatus[objective.id] || false}
                  />
                ) : (
                  <div className="py-4 text-center text-gray-400">Foco não definido</div>
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
            <p className="text-lg font-semibold text-gray-700">
              {data.meta?.valuePropositionText || 'Texto da proposta de valor não definido'}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-2">
        <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Pilares</h2>
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
          {[
            { key: 'pillarOffer', label: 'Oferta' },
            { key: 'pillarRevenue', label: 'Receita' },
            { key: 'pillarEfficiency', label: 'Eficiência' },
          ].map((pillar) => {
            const objectives = (data.regions as any)[pillar.key] as StrategicObjective[]
            return (
              <div key={pillar.key} className="rounded-lg border border-[#CFCFCF] bg-white p-1.5 shadow-sm">
                <h3 className="mb-1 border-b border-gray-200 pb-1 text-center font-semibold text-gray-700">{pillar.label}</h3>
                <div className="space-y-1">
                  {objectives.length > 0 ? (
                    objectives.map((objective) => (
                      <ReadOnlyObjectiveCard
                        key={objective.id}
                        objective={objective}
                        onView={onObjectiveView}
                        isSelected={selectedObjectiveId === objective.id}
                        hasKRs={objectiveKRStatus[objective.id] || false}
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

      <div className="mb-2">
        <h2 className="mb-2 text-center text-sm font-semibold text-gray-700">Base</h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const objective = data.regions.peopleBase[index]
            return (
              <div key={index} className="rounded-lg bg-[#DCEFE8] p-1.5">
                <div className="mb-1 text-center">
                  <span className="text-xs font-semibold text-gray-700">{baseLabels[index]}</span>
                </div>
                {objective ? (
                  <ReadOnlyObjectiveCard
                    objective={objective}
                    onView={onObjectiveView}
                    isSelected={selectedObjectiveId === objective.id}
                    hasKRs={objectiveKRStatus[objective.id] || false}
                  />
                ) : (
                  <div className="py-3 text-center text-gray-500">Sem objetivo</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
