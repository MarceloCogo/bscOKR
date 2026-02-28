'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Target, X, TrendingUp, Check, Loader2, Plus, Trash2, Pencil } from 'lucide-react'
import { useObjectiveKRs } from '@/lib/hooks/use-objective-krs'
import type { KeyResult as ObjectiveKR } from '@/lib/hooks/use-objective-krs'
import { toast } from 'sonner'
import { KREditDialog } from './kr-edit-dialog'

interface ChecklistItem {
  id: string
  title: string
  done: boolean
}

interface ObjectiveKRPanelProps {
  objective: {
    id: string
    title: string
  } | null
  onOpenChange: (open: boolean) => void
  onCreateKR?: (objective: { id: string; title: string }) => void
  canEdit?: boolean
  krRefreshToken?: number
  onKRMutation?: (payload: { objectiveId: string; action: 'create' | 'edit' | 'delete' }) => void | Promise<void>
}

export function ObjectiveKRPanel({
  objective,
  onOpenChange,
  onCreateKR,
  canEdit = false,
  krRefreshToken = 0,
  onKRMutation,
}: ObjectiveKRPanelProps) {
  const { krs, loading, loadKRs, updateKRValue, updateKRChecklist } = useObjectiveKRs(objective?.id || null)
  const [editingKRId, setEditingKRId] = useState<string | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const [savingKRId, setSavingKRId] = useState<string | null>(null)
  const [checklistDrafts, setChecklistDrafts] = useState<Record<string, ChecklistItem[]>>({})
  const [checklistSaveState, setChecklistSaveState] = useState<Record<string, 'idle' | 'pending' | 'saving' | 'saved' | 'error'>>({})
  const [editingKR, setEditingKR] = useState<ObjectiveKR | null>(null)
  const [deletingKR, setDeletingKR] = useState<ObjectiveKR | null>(null)
  const [deletingKRId, setDeletingKRId] = useState<string | null>(null)
  const checklistTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const checklistInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const checklistVersionRef = useRef<Record<string, number>>({})

  useEffect(() => {
    setChecklistDrafts((prev) => {
      const next = { ...prev }
      const validIds = new Set<string>()

      krs.forEach((kr) => {
        if (kr.type !== 'ENTREGAVEL') return
        validIds.add(kr.id)

        if (!next[kr.id]) {
          const initialItems = Array.isArray(kr.checklistJson) && kr.checklistJson.length > 0
            ? kr.checklistJson
            : [{ id: crypto.randomUUID(), title: '', done: false }]
          next[kr.id] = initialItems.map((item) => ({ id: item.id, title: item.title, done: item.done }))
        }
      })

      Object.keys(next).forEach((krId) => {
        if (!validIds.has(krId)) {
          delete next[krId]
        }
      })

      return next
    })
  }, [krs])

  useEffect(() => {
    return () => {
      Object.values(checklistTimersRef.current).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    if (!objective?.id) {
      setChecklistDrafts({})
      setChecklistSaveState({})
      Object.values(checklistTimersRef.current).forEach((timer) => clearTimeout(timer))
      checklistTimersRef.current = {}
      checklistVersionRef.current = {}
    }
  }, [objective?.id])

  useEffect(() => {
    if (!objective?.id) return
    loadKRs()
  }, [krRefreshToken, objective?.id])

  const normalizeChecklist = (items: ChecklistItem[]) => {
    return items
      .map((item) => ({ ...item, title: item.title.trim() }))
      .filter((item) => item.title.length > 0)
  }

  const persistChecklist = async (krId: string, items: ChecklistItem[], version: number) => {
    const normalized = normalizeChecklist(items)
    if (normalized.length === 0) {
      if ((checklistVersionRef.current[krId] ?? 0) === version) {
        setChecklistSaveState((prev) => ({ ...prev, [krId]: 'error' }))
      }
      return
    }

    setChecklistSaveState((prev) => ({ ...prev, [krId]: 'saving' }))
    try {
      await updateKRChecklist(krId, normalized)
      if ((checklistVersionRef.current[krId] ?? 0) !== version) return

      setChecklistSaveState((prev) => ({ ...prev, [krId]: 'saved' }))
      setTimeout(() => {
        if ((checklistVersionRef.current[krId] ?? 0) === version) {
          setChecklistSaveState((prev) => ({ ...prev, [krId]: 'idle' }))
        }
      }, 1200)
    } catch (error: any) {
      if ((checklistVersionRef.current[krId] ?? 0) !== version) return
      setChecklistSaveState((prev) => ({ ...prev, [krId]: 'error' }))
      toast.error(error?.message || 'Erro ao salvar checklist')
    }
  }

  const scheduleChecklistAutosave = (krId: string, items: ChecklistItem[]) => {
    if (checklistTimersRef.current[krId]) {
      clearTimeout(checklistTimersRef.current[krId])
    }

    const nextVersion = (checklistVersionRef.current[krId] ?? 0) + 1
    checklistVersionRef.current[krId] = nextVersion
    setChecklistSaveState((prev) => ({ ...prev, [krId]: 'pending' }))
    checklistTimersRef.current[krId] = setTimeout(() => {
      persistChecklist(krId, items, nextVersion)
    }, 500)
  }

  const updateChecklistDraft = (krId: string, updater: (current: ChecklistItem[]) => ChecklistItem[]) => {
    setChecklistDrafts((prev) => {
      const current = prev[krId] || [{ id: crypto.randomUUID(), title: '', done: false }]
      const nextItems = updater(current)
      scheduleChecklistAutosave(krId, nextItems)
      return { ...prev, [krId]: nextItems }
    })
  }

  const focusChecklistItem = (krId: string, itemId: string) => {
    window.setTimeout(() => {
      checklistInputRefs.current[`${krId}:${itemId}`]?.focus()
    }, 0)
  }

  const handleUpdateKR = (kr: ObjectiveKR) => {
    if (!canEdit) return
    setEditingKRId(kr.id)
    setEditingValue(String(kr.currentValue ?? 0))
  }

  const handleSaveUpdate = async (kr: ObjectiveKR) => {
    if (!canEdit) return
    const value = Number(editingValue)
    if (Number.isNaN(value) || value < 0) {
      toast.error('Informe um valor numerico valido')
      return
    }

    setSavingKRId(kr.id)
    try {
      await updateKRValue(kr.id, value)
      await onKRMutation?.({ objectiveId: objective?.id || '', action: 'edit' })
      toast.success('Valor atualizado com historico mensal')
      setEditingKRId(null)
      setEditingValue('')
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar KR')
    } finally {
      setSavingKRId(null)
    }
  }

  const getProgress = (kr: ObjectiveKR) => {
    return kr.computed?.progress ?? 0
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 70) return 'bg-blue-500'
    if (progress >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getStatusText = (progress: number) => {
    if (progress >= 100) return 'Concluido'
    if (progress >= 70) return 'No prazo'
    if (progress >= 40) return 'Atencao'
    return 'Critico'
  }

  const handleDeleteKR = async (krId: string) => {
    if (!canEdit) return

    setDeletingKRId(krId)
    try {
      const response = await fetch(`/api/kr/${krId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao excluir KR')
      }

      toast.success('KR excluida com sucesso')
      setDeletingKR(null)
      await loadKRs()
      await onKRMutation?.({ objectiveId: objective?.id || '', action: 'delete' })
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir KR')
    } finally {
      setDeletingKRId(null)
    }
  }

  return (
    <div
      className="flex h-full flex-col border-l border-neutral-200 bg-white"
      role="complementary"
      aria-label={`Painel de Key Results para ${objective?.title || 'objetivo'}`}
    >
      <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold" id="kr-panel-title">
          <Target className="h-5 w-5" aria-hidden="true" />
          {objective?.title || 'Key Results'}
        </h2>
        <div className="flex items-center gap-2">
          {objective && onCreateKR && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateKR(objective)}
              className="border-neutral-300 bg-white"
            >
              Criar KR
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar painel de Key Results"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4"
        role="region"
        aria-labelledby="kr-panel-title"
        aria-live="polite"
      >
        {loading ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
            <p className="mt-2 text-sm text-gray-500">Carregando KRs...</p>
          </div>
        ) : krs.length === 0 ? (
          <div className="py-12 text-center">
            <Target className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">Nenhum Key Result</h3>
            <p className="mb-4 text-sm text-gray-500">Crie KRs na aba do objetivo para acompanhar aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {krs.map((kr) => {
              const progress = getProgress(kr)
              const isEditing = editingKRId === kr.id
              const isSaving = savingKRId === kr.id
              const checklistItems = checklistDrafts[kr.id] || []

              return (
                <Card key={kr.id} className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium leading-tight">{kr.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>
                          {kr.type === 'ENTREGAVEL'
                            ? `${Math.round(progress)}% concluido`
                            : `${kr.currentValue ?? 0} / ${kr.targetValue ?? kr.thresholdValue ?? 0} ${kr.unit ?? ''}`}
                        </span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-right text-xs text-gray-500">{getStatusText(progress)}</div>
                    </div>

                    {kr.type !== 'ENTREGAVEL' && canEdit && (
                      <div className="flex gap-2">
                        {!isEditing ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateKR(kr)}
                            className="flex-1"
                            disabled={isSaving}
                            aria-label={`Atualizar valor atual do Key Result: ${kr.title}`}
                          >
                            <TrendingUp className="mr-1 h-3 w-3" aria-hidden="true" />
                            Atualizar
                          </Button>
                        ) : (
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
                              aria-label={`Salvar atualizacao do Key Result: ${kr.title}`}
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              ) : (
                                <Check className="h-3 w-3" aria-hidden="true" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingKRId(null)
                                setEditingValue('')
                              }}
                              disabled={isSaving}
                              aria-label={`Cancelar atualizacao do Key Result: ${kr.title}`}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {kr.type === 'ENTREGAVEL' && (
                      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2.5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">Checklist</span>
                          <span className="text-[11px] text-neutral-500">
                            {checklistSaveState[kr.id] === 'saving' && 'Salvando...'}
                            {checklistSaveState[kr.id] === 'pending' && 'Alteracoes pendentes'}
                            {checklistSaveState[kr.id] === 'saved' && 'Salvo'}
                            {checklistSaveState[kr.id] === 'error' && 'Adicione ao menos 1 item valido'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {checklistItems.map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.done}
                                disabled={!canEdit}
                                className="h-4 w-4 rounded border-neutral-300"
                                onChange={(e) =>
                                  updateChecklistDraft(kr.id, (current) =>
                                    current.map((currentItem) =>
                                      currentItem.id === item.id ? { ...currentItem, done: e.target.checked } : currentItem
                                    )
                                  )
                                }
                              />
                                <Input
                                ref={(el) => {
                                  checklistInputRefs.current[`${kr.id}:${item.id}`] = el
                                }}
                                value={item.title}
                                placeholder="Descreva uma entrega"
                                  className="h-8 text-sm"
                                  disabled={!canEdit}
                                  onChange={(e) =>
                                    updateChecklistDraft(kr.id, (current) =>
                                      current.map((currentItem) =>
                                      currentItem.id === item.id ? { ...currentItem, title: e.target.value } : currentItem
                                    )
                                  )
                                }
                                  onKeyDown={(e) => {
                                    if (!canEdit) return
                                    if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const newItemId = crypto.randomUUID()
                                    updateChecklistDraft(kr.id, (current) => [
                                      ...current,
                                      { id: newItemId, title: '', done: false },
                                    ])
                                    focusChecklistItem(kr.id, newItemId)
                                  }
                                }}
                              />
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-500"
                                  onClick={() =>
                                    updateChecklistDraft(kr.id, (current) => {
                                      const next = current.filter((currentItem) => currentItem.id !== item.id)
                                      return next.length > 0 ? next : [{ id: crypto.randomUUID(), title: '', done: false }]
                                    })
                                  }
                                  title="Remover item"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>

                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 h-8"
                            onClick={() => {
                              const newItemId = crypto.randomUUID()
                              updateChecklistDraft(kr.id, (current) => [
                                ...current,
                                { id: newItemId, title: '', done: false },
                              ])
                              focusChecklistItem(kr.id, newItemId)
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Adicionar item
                          </Button>
                        )}
                      </div>
                    )}

                    {canEdit && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-neutral-600"
                          onClick={() => setEditingKR(kr)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Editar KR
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-600"
                          disabled={deletingKRId === kr.id}
                          onClick={() => setDeletingKR(kr)}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Excluir KR
                        </Button>
                      </div>
                    )}

                    {kr.updateHistories && kr.updateHistories.length > 0 && (
                      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5">
                        <p className="text-[11px] font-medium text-neutral-700">Ultimas atualizacoes</p>
                        <div className="mt-1 space-y-0.5">
                          {kr.updateHistories.slice(0, 3).map((history) => (
                            <p key={history.id} className="text-[11px] text-neutral-600">
                              {history.referenceMonth}:{' '}
                              {history.eventType === 'CHECKLIST_UPDATE'
                                ? `${Math.round(history.previousProgress ?? history.previousValue)}% -> ${Math.round(history.newProgress ?? history.newValue)}% (${history.previousDoneCount ?? 0}/${history.previousItemsCount ?? 0} -> ${history.newDoneCount ?? 0}/${history.newItemsCount ?? 0})`
                                : `${history.previousValue} -> ${history.newValue} ${kr.unit ?? ''}`}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <KREditDialog
        kr={editingKR}
        open={!!editingKR}
        onOpenChange={(open) => {
          if (!open) setEditingKR(null)
        }}
        onSaved={async () => {
          await loadKRs()
          await onKRMutation?.({ objectiveId: objective?.id || '', action: 'edit' })
        }}
      />

      <Dialog open={!!deletingKR} onOpenChange={(open) => !open && setDeletingKR(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir KR</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            Tem certeza que deseja excluir a KR <span className="font-medium text-neutral-900">{deletingKR?.title}</span>? Essa acao nao pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingKR(null)} disabled={!!deletingKRId}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingKR?.id && handleDeleteKR(deletingKR.id)}
              disabled={!!deletingKRId}
            >
              {deletingKRId ? 'Excluindo...' : 'Excluir KR'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
