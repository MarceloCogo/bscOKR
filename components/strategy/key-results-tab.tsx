'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface KeyResult {
  id: string
  title: string
  description: string | null
  type: 'AUMENTO' | 'REDUCAO' | 'ENTREGAVEL' | 'LIMIAR'
  targetValue: number | null
  baselineValue: number | null
  thresholdValue: number | null
  thresholdDirection: 'MAXIMO' | 'MINIMO' | null
  currentValue: number | null
  unit: 'PERCENTUAL' | 'BRL' | 'USD' | 'EUR' | 'UNIDADE' | null
  dueDate: string
  checklistJson: Array<{ id: string; title: string; done: boolean }> | null
  computed?: {
    progress: number
    isAchieved: boolean
    statusComputed: string
  }
  status: { id: string; name: string; color: string | null } | null
  metricType: { id: string; name: string } | null
  updateHistories?: Array<{
    id: string
    eventType: 'NUMERIC_UPDATE' | 'CHECKLIST_UPDATE'
    referenceMonth: string
    previousValue: number
    newValue: number
    previousProgress: number | null
    newProgress: number | null
    previousItemsCount: number | null
    newItemsCount: number | null
    previousDoneCount: number | null
    newDoneCount: number | null
    createdAt: string
  }>
}

interface ChecklistItem {
  id: string
  title: string
  done: boolean
}

interface KeyResultsTabProps {
  objectiveId: string
  isEditMode?: boolean
  autoOpenCreateForm?: boolean
}

export function KeyResultsTab({ objectiveId, isEditMode = true, autoOpenCreateForm = false }: KeyResultsTabProps) {
  const router = useRouter()
  const [keyResults, setKeyResults] = useState<KeyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [savingValueId, setSavingValueId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newKR, setNewKR] = useState({
    type: 'AUMENTO' as 'AUMENTO' | 'REDUCAO' | 'ENTREGAVEL' | 'LIMIAR',
    title: '',
    dueDate: new Date().toISOString().slice(0, 10),
    targetValue: '',
    baselineValue: '',
    thresholdValue: '',
    thresholdDirection: 'MAXIMO' as 'MAXIMO' | 'MINIMO',
    currentValue: '0',
    unit: 'PERCENTUAL' as 'PERCENTUAL' | 'BRL' | 'USD' | 'EUR' | 'UNIDADE',
    checklistItems: [{ id: crypto.randomUUID(), title: '', done: false }] as ChecklistItem[],
  })
  const [editValues, setEditValues] = useState<{ [key: string]: { currentValue: string } }>({})
  const [checklistDrafts, setChecklistDrafts] = useState<Record<string, ChecklistItem[]>>({})
  const [checklistSaveState, setChecklistSaveState] = useState<Record<string, 'idle' | 'pending' | 'saving' | 'saved' | 'error'>>({})
  const checklistTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    loadKeyResults()
  }, [objectiveId])

  useEffect(() => {
    if (autoOpenCreateForm && isEditMode) {
      setShowAddForm(true)
    }
  }, [autoOpenCreateForm, isEditMode, objectiveId])

  useEffect(() => {
    setChecklistDrafts((prev) => {
      const next = { ...prev }
      keyResults.forEach((kr) => {
        if (kr.type !== 'ENTREGAVEL') return
        const source = Array.isArray(kr.checklistJson) && kr.checklistJson.length > 0
          ? kr.checklistJson
          : [{ id: crypto.randomUUID(), title: '', done: false }]
        next[kr.id] = source.map((item) => ({ id: item.id, title: item.title, done: item.done }))
      })
      return next
    })
  }, [keyResults])

  useEffect(() => {
    return () => {
      Object.values(checklistTimersRef.current).forEach((timer) => clearTimeout(timer))
    }
  }, [])

  const normalizeChecklist = (items: ChecklistItem[]) => {
    return items
      .map((item) => ({ ...item, title: item.title.trim() }))
      .filter((item) => item.title.length > 0)
  }

  const persistChecklist = async (krId: string, items: ChecklistItem[]) => {
    const normalized = normalizeChecklist(items)
    if (normalized.length === 0) {
      setChecklistSaveState((prev) => ({ ...prev, [krId]: 'error' }))
      return
    }

    setChecklistSaveState((prev) => ({ ...prev, [krId]: 'saving' }))
    try {
      const response = await fetch(`/api/kr/${krId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistJson: normalized }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao salvar checklist')
      }

      await loadKeyResults()
      setChecklistSaveState((prev) => ({ ...prev, [krId]: 'saved' }))
      setTimeout(() => {
        setChecklistSaveState((prev) => ({ ...prev, [krId]: 'idle' }))
      }, 1200)
    } catch (error) {
      console.error('Error autosaving checklist:', error)
      setChecklistSaveState((prev) => ({ ...prev, [krId]: 'error' }))
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar checklist')
    }
  }

  const scheduleChecklistAutosave = (krId: string, items: ChecklistItem[]) => {
    if (checklistTimersRef.current[krId]) {
      clearTimeout(checklistTimersRef.current[krId])
    }

    setChecklistSaveState((prev) => ({ ...prev, [krId]: 'pending' }))
    checklistTimersRef.current[krId] = setTimeout(() => {
      persistChecklist(krId, items)
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

  const loadKeyResults = async () => {
    try {
      const response = await fetch(`/api/kr?objectiveId=${objectiveId}`)
      if (response.ok) {
        const data = await response.json()
        setKeyResults(data.keyResults || [])
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao carregar Key Results')
      }
    } catch (error) {
      console.error('Error loading key results:', error)
      toast.error('Erro ao carregar Key Results')
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = (kr: KeyResult) => {
    return kr.computed?.progress ?? 0
  }

  const handleAddKR = async () => {
    if (!newKR.title.trim()) {
      toast.error('Informe o título da Key Result')
      return
    }

    if (!newKR.dueDate) {
      toast.error('Informe a data limite')
      return
    }

    if ((newKR.type === 'AUMENTO' || newKR.type === 'REDUCAO' || newKR.type === 'LIMIAR') && !newKR.unit) {
      toast.error('Selecione a unidade para KR numérica')
      return
    }

    if (newKR.type === 'AUMENTO' && !newKR.targetValue) {
      toast.error('Target é obrigatório para KR do tipo Aumento')
      return
    }

    if (newKR.type === 'REDUCAO' && !newKR.baselineValue) {
      toast.error('Baseline é obrigatório para KR do tipo Redução')
      return
    }

    if (newKR.type === 'REDUCAO' && !newKR.targetValue) {
      toast.error('Target é obrigatório para KR do tipo Redução')
      return
    }

    if (newKR.type === 'LIMIAR' && !newKR.thresholdValue) {
      toast.error('Valor limite é obrigatório para KR do tipo Limiar')
      return
    }

    if (newKR.type === 'ENTREGAVEL' && normalizeChecklist(newKR.checklistItems).length === 0) {
      toast.error('Adicione pelo menos um item de checklist para KR Entregavel')
      return
    }

    setIsCreating(true)
    try {
      const payload: any = {
        objectiveId,
        type: newKR.type,
        title: newKR.title,
        dueDate: newKR.dueDate,
      }

      if (newKR.type === 'AUMENTO') {
        const targetValue = parseFloat(newKR.targetValue)
        const currentValue = parseFloat(newKR.currentValue) || 0
        if (Number.isNaN(targetValue)) {
          toast.error('Target inválido para KR do tipo Aumento')
          setIsCreating(false)
          return
        }

        payload.targetValue = targetValue
        payload.currentValue = currentValue
        payload.unit = newKR.unit
        payload.baselineValue = newKR.baselineValue ? parseFloat(newKR.baselineValue) : null
      }

      if (newKR.type === 'REDUCAO') {
        const baselineValue = parseFloat(newKR.baselineValue)
        const targetValue = parseFloat(newKR.targetValue)
        const currentValue = parseFloat(newKR.currentValue) || 0
        if (Number.isNaN(baselineValue) || Number.isNaN(targetValue)) {
          toast.error('Baseline/Target inválido para KR do tipo Redução')
          setIsCreating(false)
          return
        }

        payload.baselineValue = baselineValue
        payload.targetValue = targetValue
        payload.currentValue = currentValue
        payload.unit = newKR.unit
      }

      if (newKR.type === 'LIMIAR') {
        const thresholdValue = parseFloat(newKR.thresholdValue)
        const currentValue = parseFloat(newKR.currentValue) || 0
        if (Number.isNaN(thresholdValue)) {
          toast.error('Valor de limiar inválido')
          setIsCreating(false)
          return
        }

        payload.thresholdValue = thresholdValue
        payload.currentValue = currentValue
        payload.unit = newKR.unit
        payload.thresholdDirection = newKR.thresholdDirection
      }

      if (newKR.type === 'ENTREGAVEL') {
        payload.checklistJson = normalizeChecklist(newKR.checklistItems)
      }

      const response = await fetch('/api/kr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success('Key Result criada com sucesso')
        setNewKR({
          type: 'AUMENTO',
          title: '',
          dueDate: new Date().toISOString().slice(0, 10),
          targetValue: '',
          baselineValue: '',
          thresholdValue: '',
          thresholdDirection: 'MAXIMO',
          currentValue: '0',
          unit: 'PERCENTUAL',
          checklistItems: [{ id: crypto.randomUUID(), title: '', done: false }],
        })
        setShowAddForm(false)
        await loadKeyResults()
        router.refresh()
      } else {
        const data = await response.json()
        toast.error(data.error?.formErrors?.[0] || data.error || 'Erro ao criar KR')
      }
    } catch (error) {
      console.error('Error creating key result:', error)
      toast.error('Erro ao criar KR')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateCurrentValue = async (krId: string, newValue: number) => {
    if (Number.isNaN(newValue) || newValue < 0) {
      toast.error('Informe um valor válido para atualização')
      return false
    }

    setSavingValueId(krId)
    try {
      const referenceMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      const response = await fetch(`/api/kr/${krId}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentValue: newValue, referenceMonth }),
      })

      if (response.ok) {
        toast.success('Valor atualizado e histórico mensal registrado')
        await loadKeyResults()
        router.refresh()
        return true
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao atualizar KR')
        return false
      }
    } catch (error) {
      console.error('Error updating key result:', error)
      toast.error('Erro ao atualizar KR')
      return false
    } finally {
      setSavingValueId(null)
    }
  }

  const handleDeleteKR = async (krId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta Key Result?')) return

    setDeletingId(krId)
    try {
      const response = await fetch(`/api/kr/${krId}`, { method: 'DELETE' })
      if (response.ok) {
        toast.success('Key Result excluída com sucesso')
        await loadKeyResults()
        router.refresh()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao excluir KR')
      }
    } catch (error) {
      console.error('Error deleting key result:', error)
      toast.error('Erro ao excluir KR')
    } finally {
      setDeletingId(null)
    }
  }

  const addNewKRChecklistItem = () => {
    setNewKR((prev) => ({
      ...prev,
      checklistItems: [...prev.checklistItems, { id: crypto.randomUUID(), title: '', done: false }],
    }))
  }

  const updateNewKRChecklistItem = (itemId: string, title: string) => {
    setNewKR((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.map((item) => (item.id === itemId ? { ...item, title } : item)),
    }))
  }

  const removeNewKRChecklistItem = (itemId: string) => {
    setNewKR((prev) => {
      const nextItems = prev.checklistItems.filter((item) => item.id !== itemId)
      return {
        ...prev,
        checklistItems: nextItems.length > 0 ? nextItems : [{ id: crypto.randomUUID(), title: '', done: false }],
      }
    })
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Carregando...</div>
  }

  const overallProgress = keyResults.length > 0
    ? Math.round(keyResults.reduce((sum, kr) => sum + calculateProgress(kr), 0) / keyResults.length)
    : 0

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Progresso Total:</span>
          <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <span className="text-sm font-bold">{overallProgress}%</span>
        </div>
        <span className="text-sm text-gray-500">
          {keyResults.length} KR{keyResults.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Key Results List */}
      {keyResults.length === 0 && !showAddForm ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nenhuma Key Result cadastrada</p>
          <p className="text-sm">Adicione KRs para trackear o progresso deste objetivo</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keyResults.map((kr) => {
            const progress = calculateProgress(kr)
            const isEditing = editingId === kr.id

            return (
              <Card key={kr.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm truncate">{kr.title}</h4>
                        {kr.status && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full text-white ml-2"
                            style={{ backgroundColor: kr.status.color || '#6b7280' }}
                          >
                            {kr.status.name}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              progress >= 100
                                ? 'bg-green-500'
                                : progress >= 70
                                ? 'bg-blue-500'
                                : progress >= 40
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium whitespace-nowrap">
                          {kr.type === 'ENTREGAVEL'
                            ? `${Math.round(progress)}% concluído`
                            : `${kr.currentValue ?? 0} / ${kr.targetValue ?? kr.thresholdValue ?? 0} ${kr.unit ?? ''} (${Math.round(progress)}%)`}
                        </span>
                      </div>

                      {/* Inline Edit Current Value */}
                      {isEditMode && kr.type !== 'ENTREGAVEL' && isEditing && (
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            type="number"
                            className="h-8 w-24 text-sm"
                              value={editValues[kr.id]?.currentValue ?? String(kr.currentValue ?? 0)}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                [kr.id]: { currentValue: e.target.value },
                              })
                            }
                          />
                          <Button
                            size="sm"
                            className="h-8"
                            disabled={savingValueId === kr.id}
                            onClick={async () => {
                              const value = parseFloat(editValues[kr.id]?.currentValue ?? '0')
                              const ok = await handleUpdateCurrentValue(kr.id, value)
                              if (ok) {
                                setEditingId(null)
                              }
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={savingValueId === kr.id}
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {kr.type === 'ENTREGAVEL' && (
                        <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-2.5">
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
                            {(checklistDrafts[kr.id] || [{ id: crypto.randomUUID(), title: '', done: false }]).map((item) => (
                              <div key={item.id} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.done}
                                  disabled={!isEditMode}
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
                                  value={item.title}
                                  disabled={!isEditMode}
                                  placeholder="Descreva uma entrega"
                                  className="h-8 text-sm"
                                  onChange={(e) =>
                                    updateChecklistDraft(kr.id, (current) =>
                                      current.map((currentItem) =>
                                        currentItem.id === item.id ? { ...currentItem, title: e.target.value } : currentItem
                                      )
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && isEditMode) {
                                      e.preventDefault()
                                      updateChecklistDraft(kr.id, (current) => [
                                        ...current,
                                        { id: crypto.randomUUID(), title: '', done: false },
                                      ])
                                    }
                                  }}
                                />
                                {isEditMode && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500"
                                    onClick={() =>
                                      updateChecklistDraft(kr.id, (current) => {
                                        const nextItems = current.filter((currentItem) => currentItem.id !== item.id)
                                        return nextItems.length > 0
                                          ? nextItems
                                          : [{ id: crypto.randomUUID(), title: '', done: false }]
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

                          {isEditMode && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 h-8"
                              onClick={() =>
                                updateChecklistDraft(kr.id, (current) => [
                                  ...current,
                                  { id: crypto.randomUUID(), title: '', done: false },
                                ])
                              }
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Adicionar item
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {isEditMode && (
                      <div className="flex items-center gap-1">
                        {kr.type !== 'ENTREGAVEL' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={savingValueId === kr.id || deletingId === kr.id}
                            onClick={() => {
                              setEditingId(kr.id)
                              setEditValues({ [kr.id]: { currentValue: String(kr.currentValue ?? 0) } })
                            }}
                            title="Atualizar valor atual"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500"
                          disabled={deletingId === kr.id || savingValueId === kr.id}
                          onClick={() => handleDeleteKR(kr.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Nova Key Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1">Tipo</label>
              <select
                className="w-full h-9 px-2 border rounded"
                value={newKR.type}
                onChange={(e) => setNewKR({ ...newKR, type: e.target.value as any })}
              >
                <option value="AUMENTO">Aumento</option>
                <option value="REDUCAO">Reducao</option>
                <option value="ENTREGAVEL">Entregavel</option>
                <option value="LIMIAR">Limiar</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Título</label>
              <Input
                placeholder="Ex: Aumentar receita em 20%"
                value={newKR.title}
                onChange={(e) => setNewKR({ ...newKR, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Due date</label>
              <Input
                type="date"
                value={newKR.dueDate}
                onChange={(e) => setNewKR({ ...newKR, dueDate: e.target.value })}
              />
            </div>
            {newKR.type !== 'ENTREGAVEL' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  {newKR.type === 'LIMIAR' ? 'Limiar' : 'Target'}
                </label>
                <Input
                  type="number"
                  placeholder="100"
                  value={newKR.type === 'LIMIAR' ? newKR.thresholdValue : newKR.targetValue}
                  onChange={(e) => setNewKR({
                    ...newKR,
                    ...(newKR.type === 'LIMIAR'
                      ? { thresholdValue: e.target.value }
                      : { targetValue: e.target.value }),
                  })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Unidade</label>
                <select
                  className="w-full h-9 px-2 border rounded"
                  value={newKR.unit}
                  onChange={(e) => setNewKR({ ...newKR, unit: e.target.value as 'PERCENTUAL' | 'BRL' | 'USD' | 'EUR' | 'UNIDADE' })}
                >
                  <option value="PERCENTUAL">Percentual</option>
                  <option value="BRL">BRL</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="UNIDADE">Unidade</option>
                </select>
              </div>
            </div>
            )}

            {(newKR.type === 'AUMENTO' || newKR.type === 'REDUCAO' || newKR.type === 'LIMIAR') && (
              <div className="grid grid-cols-2 gap-3">
                {newKR.type === 'REDUCAO' && (
                  <div>
                    <label className="block text-xs font-medium mb-1">Baseline</label>
                    <Input
                      type="number"
                      placeholder="120"
                      value={newKR.baselineValue}
                      onChange={(e) => setNewKR({ ...newKR, baselineValue: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium mb-1">Current</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newKR.currentValue}
                    onChange={(e) => setNewKR({ ...newKR, currentValue: e.target.value })}
                  />
                </div>
              </div>
            )}

            {newKR.type === 'LIMIAR' && (
              <div>
                <label className="block text-xs font-medium mb-1">Direction</label>
                <select
                  className="w-full h-9 px-2 border rounded"
                  value={newKR.thresholdDirection}
                  onChange={(e) => setNewKR({ ...newKR, thresholdDirection: e.target.value as 'MAXIMO' | 'MINIMO' })}
                >
                  <option value="MAXIMO">Maximo (&lt;= limite)</option>
                  <option value="MINIMO">Minimo (&gt;= limite)</option>
                </select>
              </div>
            )}

            {newKR.type === 'ENTREGAVEL' && (
              <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium">Checklist do entregavel</label>
                  <span className="text-[11px] text-neutral-500">Enter cria novo item</span>
                </div>

                {newKR.checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <Input
                      placeholder="Ex: Entregar dashboard em producao"
                      value={item.title}
                      onChange={(e) => updateNewKRChecklistItem(item.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addNewKRChecklistItem()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-red-500"
                      onClick={() => removeNewKRChecklistItem(item.id)}
                      title="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button type="button" variant="outline" size="sm" onClick={addNewKRChecklistItem}>
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar item
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddKR} disabled={isCreating}>
                <Plus className="h-4 w-4 mr-1" />
                {isCreating ? 'Adicionando...' : 'Adicionar'}
              </Button>
              <Button size="sm" variant="outline" disabled={isCreating} onClick={() => setShowAddForm(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Button */}
      {isEditMode && !showAddForm && (
        <Button variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Key Result
        </Button>
      )}
    </div>
  )
}
