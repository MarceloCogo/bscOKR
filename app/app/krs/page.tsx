'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Filter, BarChart3, Target, CheckCircle, AlertCircle, Clock } from 'lucide-react'

  id: string
  title: string
  description: string | null
  targetValue: number
  currentValue: number
  unit: string
  status: { id: string; name: string; color: string | null } | null
  metricType: { id: string; name: string } | null
  objective: {
    id: string
    title: string
  }
  cycle: {
    id: string
    name: string
  } | null
}

export default function KeyResultsPage() {
  const [keyResults, setKeyResults] = useState<KeyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [objectiveFilter, setObjectiveFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [objectives, setObjectives] = useState<{ id: string; title: string }[]>([])
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    onTrack: 0,
    atRisk: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [krResponse, objectivesResponse] = await Promise.all([
        fetch('/api/kr'),
        fetch('/api/objectives'),
      ])

      if (krResponse.ok) {
        const krData = await krResponse.json()
        setKeyResults(krData.keyResults || [])
        calculateStats(krData.keyResults || [])
      }

      if (objectivesResponse.ok) {
        const objData = await objectivesResponse.json()
        setObjectives(objData.objectives || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (krs: KeyResult[]) => {
    const total = krs.length
    const completed = krs.filter(kr => {
      const progress = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0
      return progress >= 100
    }).length
    const onTrack = krs.filter(kr => {
      const progress = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0
      return progress >= 70 && progress < 100
    }).length
    const atRisk = krs.filter(kr => {
      const progress = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0
      return progress < 70
    }).length

    setStats({ total, completed, onTrack, atRisk })
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

  const filteredKRs = keyResults.filter(kr => {
    const matchesSearch = kr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kr.objective.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesObjective = objectiveFilter === 'all' || kr.objective.id === objectiveFilter
    const matchesStatus = statusFilter === 'all' || kr.status?.id === statusFilter

    return matchesSearch && matchesObjective && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Key Results</h1>
          <p className="text-gray-500">Gerencie suas Key Results</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de KRs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">No Prazo</p>
                <p className="text-2xl font-bold text-blue-600">{stats.onTrack}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Em Risco</p>
                <p className="text-2xl font-bold text-red-600">{stats.atRisk}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar KRs..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <Select value={objectiveFilter} onValueChange={setObjectiveFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Objetivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os objetivos</SelectItem>
                {objectives.map(obj => (
                  <SelectItem key={obj.id} value={obj.id}>{obj.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="not_started">Não Iniciado</SelectItem>
                <SelectItem value="on_track">No Prazo</SelectItem>
                <SelectItem value="at_risk">Em Risco</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KR List */}
      <div className="space-y-3">
        {filteredKRs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma Key Result encontrada</p>
            </CardContent>
          </Card>
        ) : (
          filteredKRs.map(kr => {
            const progress = getProgress(kr)
            return (
              <Card key={kr.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{kr.title}</h3>
                        {kr.status && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full text-white whitespace-nowrap"
                            style={{ backgroundColor: kr.status.color || '#6b7280' }}
                          >
                            {kr.status.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        Objetivo: {kr.objective.title}
                      </p>
                      {kr.cycle && (
                        <p className="text-xs text-gray-400 mt-1">
                          Ciclo: {kr.cycle.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {kr.currentValue} / {kr.targetValue} {kr.unit}
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.round(progress)}%
                        </p>
                      </div>
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(progress)}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
