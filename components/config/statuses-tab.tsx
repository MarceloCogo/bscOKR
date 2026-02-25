'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigTable } from '@/components/config/config-table'
import {
  listObjectiveStatuses,
  createObjectiveStatus,
  updateObjectiveStatus,
  deleteObjectiveStatus,
} from '@/lib/actions/config/objective-status'
import {
  listCycleStatuses,
  createCycleStatus,
  updateCycleStatus,
  deleteCycleStatus,
} from '@/lib/actions/config/cycle-status'
import {
  listKRStatuses,
  createKRStatus,
  updateKRStatus,
  deleteKRStatus,
} from '@/lib/actions/config/kr-status'
import {
  listKRMetricTypes,
  createKRMetricType,
  updateKRMetricType,
  deleteKRMetricType,
} from '@/lib/actions/config/kr-metric-type'
import {
  listResponsibilityRoles,
  createResponsibilityRole,
  updateResponsibilityRole,
  deleteResponsibilityRole,
} from '@/lib/actions/config/responsibility-role'
import {
  listScoreRules,
  createScoreRule,
  updateScoreRule,
  deleteScoreRule,
} from '@/lib/actions/config/score-rule'

export function StatusesTab() {
  return (
    <Tabs defaultValue="objective-statuses" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="statuses">Status</TabsTrigger>
        <TabsTrigger value="metrics">Métricas</TabsTrigger>
        <TabsTrigger value="other">Outros</TabsTrigger>
      </TabsList>

      <TabsContent value="statuses">
        <Tabs defaultValue="objectives" className="w-full">
          <TabsList>
            <TabsTrigger value="objectives">Objetivos</TabsTrigger>
            <TabsTrigger value="cycles">Ciclos</TabsTrigger>
            <TabsTrigger value="krs">KR's</TabsTrigger>
          </TabsList>
          <TabsContent value="objectives"><ObjectiveStatusesTable /></TabsContent>
          <TabsContent value="cycles"><CycleStatusesTable /></TabsContent>
          <TabsContent value="krs"><KRStatusesTable /></TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="metrics">
        <KRMetricTypesTable />
      </TabsContent>

      <TabsContent value="other">
        <Tabs defaultValue="responsibility" className="w-full">
          <TabsList>
            <TabsTrigger value="responsibility">Responsabilidades</TabsTrigger>
            <TabsTrigger value="score-rules">Regras</TabsTrigger>
          </TabsList>
          <TabsContent value="responsibility"><ResponsibilityRolesTable /></TabsContent>
          <TabsContent value="score-rules"><ScoreRulesTable /></TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  )
}

function ObjectiveStatusesTable() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const statuses = await listObjectiveStatuses()
      setData(statuses)
    } catch (error) {
      console.error('Error loading objective statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const columns = [
    { key: 'key', label: 'Chave' },
    { key: 'name', label: 'Nome' },
    { key: 'order', label: 'Ordem' },
    { key: 'color', label: 'Cor', render: (value: string) => value ? <div className="w-4 h-4 rounded" style={{ backgroundColor: value }}></div> : '-' },
  ]

  const formFields = [
    { name: 'key', label: 'Chave', type: 'text' as const, required: true },
    { name: 'name', label: 'Nome', type: 'text' as const, required: true },
    { name: 'order', label: 'Ordem', type: 'number' as const, required: true },
    { name: 'color', label: 'Cor (opcional)', type: 'text' as const, required: false, placeholder: '#ff0000' },
  ]

  if (loading) return <div>Carregando...</div>

  return (
    <ConfigTable
      title="Status de Objetivos"
      description="Estados possíveis dos objetivos"
      columns={columns}
      data={data}
      onCreate={async (data) => {
        await createObjectiveStatus(data)
        await loadData()
      }}
      onUpdate={async (id, data) => {
        await updateObjectiveStatus(id, data)
        await loadData()
      }}
      onDelete={async (id) => {
        await deleteObjectiveStatus(id)
        await loadData()
      }}
      formFields={formFields}
      entityName="Status de Objetivo"
    />
  )
}

function CycleStatusesTable() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const statuses = await listCycleStatuses()
      setData(statuses)
    } catch (error) {
      console.error('Error loading cycle statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const columns = [
    { key: 'key', label: 'Chave' },
    { key: 'name', label: 'Nome' },
    { key: 'order', label: 'Ordem' },
  ]

  const formFields = [
    { name: 'key', label: 'Chave', type: 'text' as const, required: true },
    { name: 'name', label: 'Nome', type: 'text' as const, required: true },
    { name: 'order', label: 'Ordem', type: 'number' as const, required: true },
  ]

  if (loading) return <div>Carregando...</div>

  return (
    <ConfigTable
      title="Status de Ciclos"
      description="Estados dos ciclos OKR"
      columns={columns}
      data={data}
      onCreate={async (data) => {
        await createCycleStatus(data)
        await loadData()
      }}
      onUpdate={async (id, data) => {
        await updateCycleStatus(id, data)
        await loadData()
      }}
      onDelete={async (id) => {
        await deleteCycleStatus(id)
        await loadData()
      }}
      formFields={formFields}
      entityName="Status de Ciclo"
    />
  )
}

function KRStatusesTable() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const statuses = await listKRStatuses()
      setData(statuses)
    } catch (error) {
      console.error('Error loading KR statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const columns = [
    { key: 'key', label: 'Chave' },
    { key: 'name', label: 'Nome' },
    { key: 'order', label: 'Ordem' },
    { key: 'color', label: 'Cor', render: (value: string) => value ? <div className="w-4 h-4 rounded" style={{ backgroundColor: value }}></div> : '-' },
  ]

  const formFields = [
    { name: 'key', label: 'Chave', type: 'text' as const, required: true },
    { name: 'name', label: 'Nome', type: 'text' as const, required: true },
    { name: 'order', label: 'Ordem', type: 'number' as const, required: true },
    { name: 'color', label: 'Cor (opcional)', type: 'text' as const, required: false, placeholder: '#ff0000' },
  ]

  if (loading) return <div>Carregando...</div>

  return (
    <ConfigTable
      title="Status de KR"
      description="Estados dos Key Results"
      columns={columns}
      data={data}
      onCreate={async (data) => {
        await createKRStatus(data)
        await loadData()
      }}
      onUpdate={async (id, data) => {
        await updateKRStatus(id, data)
        await loadData()
      }}
      onDelete={async (id) => {
        await deleteKRStatus(id)
        await loadData()
      }}
      formFields={formFields}
      entityName="Status de KR"
    />
  )
}

function KRMetricTypesTable() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const types = await listKRMetricTypes()
      setData(types)
    } catch (error) {
      console.error('Error loading KR metric types:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const columns = [
    { key: 'key', label: 'Chave' },
    { key: 'name', label: 'Nome' },
    { key: 'order', label: 'Ordem' },
  ]

  const formFields = [
    { name: 'key', label: 'Chave', type: 'text' as const, required: true },
    { name: 'name', label: 'Nome', type: 'text' as const, required: true },
    { name: 'order', label: 'Ordem', type: 'number' as const, required: true },
  ]

  if (loading) return <div>Carregando...</div>

  return (
    <ConfigTable
      title="Tipos de Métrica KR"
      description="Tipos de medição (Número, Percentual, etc.)"
      columns={columns}
      data={data}
      onCreate={async (data) => {
        await createKRMetricType(data)
        await loadData()
      }}
      onUpdate={async (id, data) => {
        await updateKRMetricType(id, data)
        await loadData()
      }}
      onDelete={async (id) => {
        await deleteKRMetricType(id)
        await loadData()
      }}
      formFields={formFields}
      entityName="Tipo de Métrica KR"
    />
  )
}

function ResponsibilityRolesTable() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const roles = await listResponsibilityRoles()
      setData(roles)
    } catch (error) {
      console.error('Error loading responsibility roles:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const columns = [
    { key: 'key', label: 'Chave' },
    { key: 'name', label: 'Nome' },
    { key: 'semantics', label: 'Semântica' },
    { key: 'order', label: 'Ordem' },
  ]

  const formFields = [
    { name: 'key', label: 'Chave', type: 'text' as const, required: true },
    { name: 'name', label: 'Nome', type: 'text' as const, required: true },
    { name: 'semantics', label: 'Semântica', type: 'textarea' as const, required: true },
    { name: 'order', label: 'Ordem', type: 'number' as const, required: true },
  ]

  if (loading) return <div>Carregando...</div>

  return (
    <ConfigTable
      title="Funções de Responsabilidade"
      description="Papéis em objetivos (Responsável, Dono, etc.)"
      columns={columns}
      data={data}
      onCreate={async (data) => {
        await createResponsibilityRole(data)
        await loadData()
      }}
      onUpdate={async (id, data) => {
        await updateResponsibilityRole(id, data)
        await loadData()
      }}
      onDelete={async (id) => {
        await deleteResponsibilityRole(id)
        await loadData()
      }}
      formFields={formFields}
      entityName="Função de Responsabilidade"
    />
  )
}

function ScoreRulesTable() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const rules = await listScoreRules()
      setData(rules)
    } catch (error) {
      console.error('Error loading score rules:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const columns = [
    { key: 'scope', label: 'Escopo' },
    { key: 'formulaKey', label: 'Fórmula' },
    { key: 'paramsJson', label: 'Parâmetros', render: (value: string) => {
      try {
        const parsed = JSON.parse(value)
        return <code className="text-xs">{JSON.stringify(parsed, null, 2)}</code>
      } catch {
        return value
      }
    }},
  ]

  const formFields = [
    { name: 'scope', label: 'Escopo', type: 'text' as const, required: true },
    { name: 'formulaKey', label: 'Chave da Fórmula', type: 'text' as const, required: true },
    { name: 'paramsJson', label: 'Parâmetros JSON', type: 'textarea' as const, required: true, placeholder: '{"key": "value"}' },
  ]

  if (loading) return <div>Carregando...</div>

  return (
    <ConfigTable
      title="Regras de Pontuação"
      description="Regras de cálculo de progresso"
      columns={columns}
      data={data}
      onCreate={async (data) => {
        await createScoreRule(data)
        await loadData()
      }}
      onUpdate={async (id, data) => {
        await updateScoreRule(id, data)
        await loadData()
      }}
      onDelete={async (id) => {
        await deleteScoreRule(id)
        await loadData()
      }}
      formFields={formFields}
      entityName="Regra de Pontuação"
    />
  )
}