'use client'

import { useEffect, useState } from 'react'
import { ConfigTable } from '@/components/config/config-table'
import {
  listOrgNodeTypes,
  createOrgNodeType,
  updateOrgNodeType,
  deleteOrgNodeType,
} from '@/lib/actions/config/org-node-type'

export function OrgTypesTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const orgNodeTypes = await listOrgNodeTypes()
      setData(orgNodeTypes)
    } catch (error) {
      console.error('Error loading org node types:', error)
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

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <ConfigTable
      title="Tipos de Nó Organizacional"
      description="Estrutura organizacional (Empresa, Diretoria, Gerência, etc.)"
      columns={columns}
      data={data}
      onCreate={async (data) => {
        await createOrgNodeType(data)
        await loadData()
      }}
      onUpdate={async (id, data) => {
        await updateOrgNodeType(id, data)
        await loadData()
      }}
      onDelete={async (id) => {
        await deleteOrgNodeType(id)
        await loadData()
      }}
      formFields={formFields}
      entityName="Tipo de Nó Organizacional"
    />
  )
}