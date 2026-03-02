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
        const enabled = Object.entries(parsed)
          .filter(([, enabledValue]) => Boolean(enabledValue))
          .map(([permission]) => permission)

        return (
          <div className="flex flex-wrap gap-1">
            {enabled.length === 0 && <span className="text-xs text-muted-foreground">Sem permissões</span>}
            {enabled.map((permission) => (
              <span key={permission} className="rounded bg-muted px-2 py-0.5 text-xs">
                {permission}
              </span>
            ))}
          </div>
        )
      } catch {
        return value
      }
    }},
  ]

  const formFields = [
    { name: 'key', label: 'Chave', type: 'text' as const, required: true },
    { name: 'name', label: 'Nome', type: 'text' as const, required: true },
    {
      name: 'permissionsJson',
      label: 'Permissões JSON',
      type: 'textarea' as const,
      required: true,
      placeholder: JSON.stringify({
        canManageUsers: false,
        canManageConfig: false,
        canViewAll: false,
        canEditAll: false,
        canViewStrategyMap: true,
        canViewObjectives: true,
        canViewKRs: true,
      }, null, 2),
    },
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
