'use client'

import { useEffect, useState } from 'react'
import { ConfigTable } from '@/components/config/config-table'
import {
  listPillars,
  createPillar,
  updatePillar,
  deletePillar,
} from '@/lib/actions/config/pillar'

export function PillarTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const pillars = await listPillars()
      setData(pillars)
    } catch (error) {
      console.error('Error loading pillars:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const columns = [
    { key: 'name', label: 'Nome' },
    { key: 'order', label: 'Ordem' },
  ]

  const formFields = [
    { name: 'name', label: 'Nome', type: 'text' as const, required: true },
    { name: 'order', label: 'Ordem', type: 'number' as const, required: true },
  ]

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <ConfigTable
      title="Pilares"
      description="Pilares estratégicos da organização"
      columns={columns}
      data={data}
      onCreate={async (data) => {
        await createPillar(data)
        await loadData()
      }}
      onUpdate={async (id, data) => {
        await updatePillar(id, data)
        await loadData()
      }}
      onDelete={async (id) => {
        await deletePillar(id)
        await loadData()
      }}
      formFields={formFields}
      entityName="Pilar"
    />
  )
}