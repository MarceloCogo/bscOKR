'use client'

import { Card, CardContent } from '@/components/ui/card'

interface Perspective {
  id: string
  name: string
  order: number
}

interface StrategicObjective {
  id: string
  title: string
  perspective: Perspective
  pillar?: { name: string } | null
  status: { name: string; color?: string | null }
  sponsor: { name: string }
  weight: number
  orgNode: { id: string; name: string; type: { name: string } }
}

interface StrategyMapProps {
  objectives: StrategicObjective[]
  perspectives: Perspective[]
  activeOrgNodeId?: string | null
}

export function StrategyMap({ objectives, perspectives, activeOrgNodeId }: StrategyMapProps) {
  // Filter objectives by active org node if specified
  const filteredObjectives = activeOrgNodeId
    ? objectives.filter(obj => obj.orgNode.id === activeOrgNodeId)
    : objectives

  const objectivesByPerspective = perspectives.map(perspective => ({
    perspective,
    objectives: filteredObjectives.filter(obj => obj.perspective.id === perspective.id),
  }))

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {objectivesByPerspective.map(({ perspective, objectives }) => (
        <div key={perspective.id} className="space-y-4">
          <h2 className="text-xl font-semibold text-center">{perspective.name}</h2>
          <div className="space-y-3">
            {objectives.map(objective => (
              <Card key={objective.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">{objective.title}</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="px-2 py-1 text-xs border rounded"
                      style={{ borderColor: objective.status.color || '#6b7280' }}
                    >
                      {objective.status.name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Peso: {objective.weight}%
                    </span>
                  </div>
                  {objective.pillar && (
                    <p className="text-sm text-muted-foreground mb-2">
                      Pilar: {objective.pillar.name}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Sponsor: {objective.sponsor.name}
                  </p>
                </CardContent>
              </Card>
            ))}
            {objectives.length === 0 && (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  Nenhum objetivo nesta perspectiva
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}