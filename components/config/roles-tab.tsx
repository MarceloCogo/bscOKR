'use client'

import { useEffect, useState } from 'react'
import { ConfigTable } from '@/components/config/config-table'
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole,
} from '@/lib/actions/config/role'

export function RolesTab() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const roles = await listRoles()
      setData(roles)
    } catch (error) {
      console.error('Error loading roles:', error)
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
    { key: 'permissionsJson', label: 'Permissões', render: (value: string) => {
      try {
        const parsed = JSON.parse(value)
        return <code className="text-xs">{JSON.stringify(parsed, null, 2)}</code>
      } catch {
        return value
      }
    }},
  ]

  const formFields = [
    { name: 'key', label: 'Chave', type: 'text' as const, required: true },
    { name: 'name', label: 'Nome', type: 'text' as const, required: true },
    { name: 'permissionsJson', label: 'Permissões JSON', type: 'textarea' as const, required: true, placeholder: '{"canManageUsers": true}' },
  ]

  if (loading) {
    return <div>Carregando...</div>
  }

  return (
    <ConfigTable
      title="Funções de Usuário"
      description="Funções e permissões no sistema"
      columns={columns}
      data={data}
      onCreate={async (data) => {
        await createRole(data)
        await loadData()
      }}
      onUpdate={async (id, data) => {
        await updateRole(id, data)
        await loadData()
      }}
      onDelete={async (id) => {
        await deleteRole(id)
        await loadData()
      }}
      formFields={formFields}
      entityName="Função"
    />
  )
}