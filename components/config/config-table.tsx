'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { ConfigFormModal } from './config-form-modal'

interface Column {
  key: string
  label: string
  render?: (value: any, item: any) => React.ReactNode
}

interface ConfigTableProps {
  title: string
  description: string
  columns: Column[]
  data: any[]
  onCreate: (data: any) => Promise<void>
  onUpdate: (id: string, data: any) => Promise<void>
  onDelete: (id: string) => Promise<void>
  formFields: any[]
  entityName: string
}

export function ConfigTable({
  title,
  description,
  columns,
  data,
  onCreate,
  onUpdate,
  onDelete,
  formFields,
  entityName,
}: ConfigTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  const handleCreate = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm(`Tem certeza que deseja excluir este ${entityName.toLowerCase()}?`)) {
      try {
        await onDelete(id)
      } catch (error) {
        alert(`Erro ao excluir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
      }
    }
  }

  const handleSubmit = async (data: any) => {
    try {
      if (editingItem) {
        await onUpdate(editingItem.id, data)
      } else {
        await onCreate(data)
      }
      setIsModalOpen(false)
      setEditingItem(null)
    } catch (error) {
      throw error
    }
  }

  return (
    <>
      <Card className="stat-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </div>
          <Button onClick={handleCreate} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Novo
          </Button>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">Nenhum registro encontrado</p>
              <p className="text-muted-foreground/70 text-sm mt-2">
                Clique em "Novo" para adicionar o primeiro registro
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    {columns.map((column) => (
                      <TableHead key={column.key} className="font-semibold text-foreground">
                        {column.label}
                      </TableHead>
                    ))}
                    <TableHead className="w-24 font-semibold text-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      {columns.map((column) => (
                        <TableCell key={column.key} className="py-4">
                          {column.render ? column.render(item[column.key], item) : item[column.key]}
                        </TableCell>
                      ))}
                      <TableCell className="py-4">
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfigFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(null)
        }}
        onSubmit={handleSubmit}
        fields={formFields}
        initialData={editingItem}
        title={editingItem ? `Editar ${entityName}` : `Novo ${entityName}`}
      />
    </>
  )
}