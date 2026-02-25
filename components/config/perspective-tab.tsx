'use client'

import { useEffect, useState } from 'react'
import { ConfigTable } from '@/components/config/config-table'
import {
  listPerspectives,
  createPerspective,
  updatePerspective,
  deletePerspective,
} from '@/lib/actions/config/perspective'

export function PerspectiveTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const perspectives = await listPerspectives()
      setData(perspectives)
    } catch (error) {
      console.error('Error loading perspectives:', error)
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
      title="Perspectivas"
      description="Perspectivas BSC (Financeira, Cliente, Processos, Aprendizado)"
      columns={columns}
      data={data}
      onCreate={async (data) => {
        await createPerspective(data)
        await loadData()
      }}
      onUpdate={async (id, data) => {
        await updatePerspective(id, data)
        await loadData()
      }}
      onDelete={async (id) => {
        await deletePerspective(id)
        await loadData()
      }}
      formFields={formFields}
      entityName="Perspectiva"
    />
  )
}