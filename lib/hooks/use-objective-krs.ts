import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export interface KeyResult {
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
  cycle?: { id: string; name: string } | null
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

export function useObjectiveKRs(objectiveId: string | null) {
  const [krs, setKrs] = useState<KeyResult[]>([])
  const [loading, setLoading] = useState(false)

  const loadKRs = async () => {
    if (!objectiveId) {
      setKrs([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/kr?objectiveId=${objectiveId}`)
      if (response.ok) {
        const data = await response.json()
        setKrs(data.keyResults || [])
      } else {
        toast.error('Erro ao carregar KRs')
      }
    } catch (error) {
      toast.error('Erro ao carregar KRs')
    } finally {
      setLoading(false)
    }
  }

  const updateKRValue = async (krId: string, newValue: number, referenceMonth?: string) => {
    const monthRef =
      typeof referenceMonth === 'string' && /^\d{4}-\d{2}$/.test(referenceMonth)
        ? referenceMonth
        : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    const response = await fetch(`/api/kr/${krId}/update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentValue: newValue, referenceMonth: monthRef }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Erro ao atualizar KR')
    }

    await loadKRs()
  }

  const updateKRChecklist = async (krId: string, checklistJson: ChecklistItem[], referenceMonth?: string) => {
    const monthRef =
      typeof referenceMonth === 'string' && /^\d{4}-\d{2}$/.test(referenceMonth)
        ? referenceMonth
        : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

    const response = await fetch(`/api/kr/${krId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklistJson, referenceMonth: monthRef }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Erro ao atualizar checklist do KR')
    }

    const data = await response.json()
    const updatedKR = data.keyResult as KeyResult
    setKrs((prev) => prev.map((kr) => (kr.id === krId ? updatedKR : kr)))
    return updatedKR
  }

  useEffect(() => {
    loadKRs()
  }, [objectiveId])

  return {
    krs,
    loading,
    loadKRs,
    updateKRValue,
    updateKRChecklist,
  }
}
