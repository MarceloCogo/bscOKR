'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit, Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

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
}

interface KeyResultsTabProps {
  objectiveId: string
  isEditMode?: boolean
  cycles?: { id: string; name: string; key: string }[]
}

interface CycleOption {
  id: string
  name: string
  key: string
}

export function KeyResultsTab({ objectiveId, isEditMode = true, cycles = [] }: KeyResultsTabProps) {
  const router = useRouter()
  const [keyResults, setKeyResults] = useState<KeyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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
    checklistFirstItem: '',
    cycleId: '',
  })
  const [editValues, setEditValues] = useState<{ [key: string]: { currentValue: string } }>({})

  useEffect(() => {
    loadKeyResults()
  }, [objectiveId])

  const loadKeyResults = async () => {
    try {
      const response = await fetch(`/api/kr?objectiveId=${objectiveId}`)
      if (response.ok) {
        const data = await response.json()
        setKeyResults(data.keyResults || [])
      }
    } catch (error) {
      console.error('Error loading key results:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateProgress = (kr: KeyResult) => {
    return kr.computed?.progress ?? 0
  }

  const handleAddKR = async () => {
    if (!newKR.title.trim() || !newKR.dueDate) return

    if ((newKR.type === 'AUMENTO' || newKR.type === 'REDUCAO' || newKR.type === 'LIMIAR') && !newKR.unit) {
      return
    }

    if (newKR.type === 'REDUCAO' && !newKR.baselineValue) {
      return
    }

    if (newKR.type === 'LIMIAR' && !newKR.thresholdValue) {
      return
    }

    if (newKR.type === 'ENTREGAVEL' && !newKR.checklistFirstItem.trim()) {
      return
    }

    try {
      const payload: any = {
        objectiveId,
        type: newKR.type,
        title: newKR.title,
        dueDate: newKR.dueDate,
        cycleId: newKR.cycleId || null,
      }

      if (newKR.type === 'AUMENTO') {
        payload.targetValue = parseFloat(newKR.targetValue)
        payload.currentValue = parseFloat(newKR.currentValue) || 0
        payload.unit = newKR.unit
        payload.baselineValue = newKR.baselineValue ? parseFloat(newKR.baselineValue) : null
      }

      if (newKR.type === 'REDUCAO') {
        payload.baselineValue = parseFloat(newKR.baselineValue)
        payload.targetValue = parseFloat(newKR.targetValue)
        payload.currentValue = parseFloat(newKR.currentValue) || 0
        payload.unit = newKR.unit
      }

      if (newKR.type === 'LIMIAR') {
        payload.thresholdValue = parseFloat(newKR.thresholdValue)
        payload.currentValue = parseFloat(newKR.currentValue) || 0
        payload.unit = newKR.unit
        payload.thresholdDirection = newKR.thresholdDirection
      }

      if (newKR.type === 'ENTREGAVEL') {
        payload.checklistJson = [{
          id: crypto.randomUUID(),
          title: newKR.checklistFirstItem,
          done: false,
        }]
      }

      const response = await fetch('/api/kr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
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
          checklistFirstItem: '',
          cycleId: '',
        })
        setShowAddForm(false)
        loadKeyResults()
        router.refresh()
      }
    } catch (error) {
      console.error('Error creating key result:', error)
    }
  }

  const handleUpdateCurrentValue = async (krId: string, newValue: number) => {
    try {
      await fetch(`/api/kr/${krId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentValue: newValue }),
      })
      loadKeyResults()
      router.refresh()
    } catch (error) {
      console.error('Error updating key result:', error)
    }
  }

  const handleDeleteKR = async (krId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta Key Result?')) return

    try {
      await fetch(`/api/kr/${krId}`, { method: 'DELETE' })
      loadKeyResults()
      router.refresh()
    } catch (error) {
      console.error('Error deleting key result:', error)
    }
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
                      {isEditMode && isEditing && (
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
                            onClick={() => {
                              const value = parseFloat(editValues[kr.id]?.currentValue ?? '0')
                              handleUpdateCurrentValue(kr.id, value)
                              setEditingId(null)
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {isEditMode && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditingId(kr.id)
                             setEditValues({ [kr.id]: { currentValue: String(kr.currentValue ?? 0) } })
                          }}
                          title="Atualizar valor atual"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500"
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
              <div>
                <label className="block text-xs font-medium mb-1">Primeiro item do checklist</label>
                <Input
                  placeholder="Ex: Entregar dashboard em produção"
                  value={newKR.checklistFirstItem}
                  onChange={(e) => setNewKR({ ...newKR, checklistFirstItem: e.target.value })}
                />
              </div>
            )}
            {cycles.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-1">Ciclo (opcional)</label>
                <select
                  className="w-full h-9 px-2 border rounded"
                  value={newKR.cycleId}
                  onChange={(e) => setNewKR({ ...newKR, cycleId: e.target.value })}
                >
                  <option value="">Nenhum</option>
                  {cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddKR}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
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
