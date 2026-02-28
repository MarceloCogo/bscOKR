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

  const updateKRValue = (krId: string, newValue: number) => {
    setKrs(prev => prev.map(kr =>
      kr.id === krId ? { ...kr, currentValue: newValue } : kr
    ))
  }

  useEffect(() => {
    loadKRs()
  }, [objectiveId])

  return {
    krs,
    loading,
    loadKRs,
    updateKRValue,
  }
}
