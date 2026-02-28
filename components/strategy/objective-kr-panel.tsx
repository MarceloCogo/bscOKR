'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, X, TrendingUp, Check, Loader2 } from 'lucide-react'
import { useObjectiveKRs } from '@/lib/hooks/use-objective-krs'
import { toast } from 'sonner'

interface ObjectiveKRPanelProps {
  objective: {
    id: string
    title: string
  } | null
  onOpenChange: (open: boolean) => void
}

export function ObjectiveKRPanel({ objective, onOpenChange }: ObjectiveKRPanelProps) {
  const { krs, loading, updateKRValue } = useObjectiveKRs(objective?.id || null)
  const [editingKRId, setEditingKRId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [savingKRId, setSavingKRId] = useState<string | null>(null)

  const handleUpdateKR = (kr: any) => {
    if (kr.type === 'ENTREGAVEL') {
      toast.error('KRs ENTREGAVEL devem ser atualizados por checklist')
      return
    }

    setEditingKRId(kr.id)
    setEditingValue(String(kr.currentValue ?? 0))
  }

  const handleSaveUpdate = async (kr: any) => {
    const value = Number(editingValue)
    if (Number.isNaN(value) || value < 0) {
      toast.error('Informe um valor numérico válido')
      return
    }

    setSavingKRId(kr.id)
    try {
      await updateKRValue(kr.id, value)
      toast.success('Valor atualizado com histórico mensal')
      setEditingKRId(null)
      setEditingValue('')
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar KR')
    } finally {
      setSavingKRId(null)
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
              Crie KRs na aba do objetivo para acompanhar aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {krs.map((kr) => {
              const progress = getProgress(kr)
              const isEditing = editingKRId === kr.id
              const isSaving = savingKRId === kr.id

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
                        {kr.type !== 'ENTREGAVEL' && !isEditing && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateKR(kr)}
                            className="flex-1"
                            disabled={isSaving}
                            aria-label={`Atualizar valor atual do Key Result: ${kr.title}`}
                          >
                            <TrendingUp className="w-3 h-3 mr-1" aria-hidden="true" />
                            Atualizar
                          </Button>
                        )}

                        {kr.type !== 'ENTREGAVEL' && isEditing && (
                          <div className="flex w-full items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              className="h-8"
                              disabled={isSaving}
                              aria-label={`Novo valor atual para ${kr.title}`}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveUpdate(kr)}
                              disabled={isSaving}
                              aria-label={`Salvar atualização do Key Result: ${kr.title}`}
                            >
                              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> : <Check className="w-3 h-3" aria-hidden="true" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingKRId(null)
                                setEditingValue('')
                              }}
                              disabled={isSaving}
                              aria-label={`Cancelar atualização do Key Result: ${kr.title}`}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>

                      {kr.type !== 'ENTREGAVEL' && kr.updateHistories && kr.updateHistories.length > 0 && (
                        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5">
                          <p className="text-[11px] font-medium text-neutral-700">Ultimas atualizacoes</p>
                          <div className="mt-1 space-y-0.5">
                            {kr.updateHistories.slice(0, 3).map((history: any) => (
                              <p key={history.id} className="text-[11px] text-neutral-600">
                                {history.referenceMonth}: {history.previousValue} → {history.newValue} {kr.unit ?? ''}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
