'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, X, TrendingUp } from 'lucide-react'
import { useObjectiveKRs } from '@/lib/hooks/use-objective-krs'
import { KRUpdateModal } from './kr-update-modal'

interface ObjectiveKRPanelProps {
  objective: {
    id: string
    title: string
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  cycles?: { id: string; name: string }[]
}

export function ObjectiveKRPanel({ objective, open, onOpenChange, cycles = [] }: ObjectiveKRPanelProps) {
  const { krs, loading, updateKRValue } = useObjectiveKRs(objective?.id || null)
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [selectedKR, setSelectedKR] = useState<any>(null)

  const handleUpdateKR = (kr: any) => {
    setSelectedKR(kr)
    setUpdateModalOpen(true)
  }

  const handleUpdateComplete = (newValue: number) => {
    if (selectedKR) {
      updateKRValue(selectedKR.id, newValue)
    }
  }

  const getProgress = (kr: any) => {
    return kr.computed?.progress ?? 0
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 70) return 'bg-blue-500'
    if (progress >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusText = (progress: number) => {
    if (progress >= 100) return '✅ Concluído'
    if (progress >= 70) return '📈 No prazo'
    if (progress >= 40) return '⚠️ Atenção'
    return '🚨 Crítico'
  }

  return (
    <div
      className="flex flex-col h-full bg-white border-l border-neutral-200"
      role="complementary"
      aria-label={`Painel de Key Results para ${objective?.title || 'objetivo'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-50">
        <h2 className="font-semibold text-lg flex items-center gap-2" id="kr-panel-title">
          <Target className="w-5 h-5" aria-hidden="true" />
          {objective?.title || 'Key Results'}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          aria-label="Fechar painel de Key Results"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto p-4"
        role="region"
        aria-labelledby="kr-panel-title"
        aria-live="polite"
      >
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Carregando KRs...</p>
          </div>
        ) : krs.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum Key Result
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Este objetivo ainda não tem Key Results definidos.
            </p>
            <Button size="sm">
              Criar primeiro KR
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {krs.map((kr) => {
              const progress = getProgress(kr)
              return (
                <Card key={kr.id} className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium leading-tight">
                      {kr.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>
                            {kr.type === 'ENTREGAVEL'
                              ? `${Math.round(progress)}% concluido`
                              : `${kr.currentValue ?? 0} / ${kr.targetValue ?? kr.thresholdValue ?? 0} ${kr.unit ?? ''}`}
                          </span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-500 text-right">
                          {getStatusText(progress)}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {kr.type !== 'ENTREGAVEL' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateKR(kr)}
                            className="flex-1"
                            aria-label={`Atualizar valor atual do Key Result: ${kr.title}`}
                          >
                            <TrendingUp className="w-3 h-3 mr-1" aria-hidden="true" />
                            Atualizar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Update Modal */}
      {selectedKR && (
        <KRUpdateModal
          kr={selectedKR}
          open={updateModalOpen}
          onOpenChange={setUpdateModalOpen}
          onUpdate={handleUpdateComplete}
        />
      )}
    </div>
  )
}
