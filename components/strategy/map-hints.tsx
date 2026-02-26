'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Lightbulb } from 'lucide-react'

interface MapHint {
  id: string
  title: string
  content: string
  region?: string
}

interface MapHintsProps {
  visibleHints?: string[]
  onHintViewed?: (hintId: string) => void
}

const AVAILABLE_HINTS: MapHint[] = [
  {
    id: 'map.ambition',
    title: 'Comece pela Ambição',
    content: 'Defina a visão de longo prazo (3-5 anos) da sua organização. Esta é a base de todo o planejamento estratégico.',
    region: 'ambition',
  },
  {
    id: 'map.growth_focus',
    title: 'Focos de Crescimento',
    content: 'Selecione 3-4 prioridades estratégicas que guiarão seus esforços nos próximos períodos.',
    region: 'growthFocus',
  },
  {
    id: 'map.value_proposition',
    title: 'Proposta de Valor',
    content: 'Como sua organização entrega valor único aos clientes? Defina sua proposta de valor distintiva.',
    region: 'valueProposition',
  },
  {
    id: 'map.pillars',
    title: 'Pilares Estratégicos',
    content: 'Defina as capacidades críticas (Oferta, Receita, Eficiência) que suportam seus objetivos.',
    region: 'pillars',
  },
  {
    id: 'map.people_base',
    title: 'Base de Pessoas',
    content: 'Quais competências e estrutura de equipe são necessárias para executar sua estratégia?',
    region: 'peopleBase',
  },
]

export function MapHints({ visibleHints = [], onHintViewed }: MapHintsProps) {
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set())

  const hintsToShow = AVAILABLE_HINTS.filter(
    hint => visibleHints.includes(hint.id) && !dismissedHints.has(hint.id)
  )

  const dismissHint = (hintId: string) => {
    setDismissedHints(prev => new Set(Array.from(prev).concat(hintId)))
    onHintViewed?.(hintId)
  }

  if (hintsToShow.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {hintsToShow.map((hint) => (
        <Card key={hint.id} className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-blue-900">{hint.title}</h4>
                <p className="text-sm text-blue-800 mt-1">{hint.content}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissHint(hint.id)}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}