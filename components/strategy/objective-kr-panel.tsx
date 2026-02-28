'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Plus, Edit, Trash2, TrendingUp, Target } from 'lucide-react'
import { KRUpdateModal } from './kr-update-modal'
import { useObjectiveKRs, type KeyResult } from '@/lib/hooks/use-objective-krs'

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
  const [selectedKR, setSelectedKR] = useState<KeyResult | null>(null)

  const handleUpdateKR = (kr: KeyResult) => {
    setSelectedKR(kr)
    setUpdateModalOpen(true)
  }

  const handleUpdateComplete = (newValue: number) => {
    if (selectedKR) {
      updateKRValue(selectedKR.id, newValue)
    }
  }

  const getProgress = (kr: KeyResult) => {
    if (kr.targetValue === 0) return 0
    return Math.min(100, Math.max(0, (kr.currentValue / kr.targetValue) * 100))
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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[450px] sm:w-[450px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {objective?.title || 'Key Results'}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Carregando...</p>
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
                  <Plus className="w-4 h-4 mr-2" />
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
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium leading-tight">
                            {kr.title}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>{kr.currentValue} / {kr.targetValue} {kr.unit}</span>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateKR(kr)}
                              className="flex-1"
                            >
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Atualizar
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Add new KR */}
                <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-center py-6">
                    <Button variant="ghost" className="text-gray-500 hover:text-blue-600">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Key Result
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Update Modal */}
      {selectedKR && (
        <KRUpdateModal
          kr={selectedKR}
          open={updateModalOpen}
          onOpenChange={setUpdateModalOpen}
          onUpdate={handleUpdateComplete}
        />
      )}
    </>
  )
}
