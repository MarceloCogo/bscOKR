'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Edit, Trash2, Calendar } from 'lucide-react'

interface Cycle {
  id: string
  name: string
  key: string
  startDate: string
  endDate: string
  status: { id: string; name: string; key: string } | null
}

interface CycleStatus {
  id: string
  name: string
  key: string
}

export default function CyclesPage() {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [statuses, setStatuses] = useState<CycleStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    startDate: '',
    endDate: '',
    statusId: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [cyclesRes, statusesRes] = await Promise.all([
        fetch('/api/cycle'),
        fetch('/api/config/cycle-statuses'),
      ])

      if (cyclesRes.ok) {
        const data = await cyclesRes.json()
        setCycles(data.cycles || [])
      }

      if (statusesRes.ok) {
        const data = await statusesRes.json()
        setStatuses(data.statuses || [])
        if (data.statuses?.length > 0) {
          setFormData(prev => ({ ...prev, statusId: data.statuses[0].id }))
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.key.trim()) {
      toast.error('Preencha o nome e a chave')
      return
    }

    try {
      const url = editingCycle ? `/api/cycle/${editingCycle.id}` : '/api/cycle'
      const method = editingCycle ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success(editingCycle ? 'Ciclo atualizado' : 'Ciclo criado')
        setDialogOpen(false)
        resetForm()
        loadData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erro ao salvar')
      }
    } catch (error) {
      toast.error('Erro ao salvar')
    }
  }

  const handleEdit = (cycle: Cycle) => {
    setEditingCycle(cycle)
    setFormData({
      name: cycle.name,
      key: cycle.key,
      startDate: cycle.startDate.split('T')[0],
      endDate: cycle.endDate.split('T')[0],
      statusId: cycle.status?.id || '',
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return

    try {
      const res = await fetch(`/api/cycle/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Ciclo excluído')
        loadData()
      } else {
        toast.error('Erro ao excluir')
      }
    } catch (error) {
      toast.error('Erro ao excluir')
    }
  }

  const resetForm = () => {
    setEditingCycle(null)
    setFormData({
      name: '',
      key: '',
      startDate: '',
      endDate: '',
      statusId: statuses[0]?.id || '',
    })
  }

  const openNewDialog = () => {
    resetForm()
    setDialogOpen(true)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getStatusBadgeVariant = (key: string) => {
    switch (key) {
      case 'ACTIVE':
        return 'default'
      case 'PLANNING':
        return 'secondary'
      case 'COMPLETED':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Ciclos
          </h1>
          <p className="text-muted-foreground">Gerencie os ciclos de OKR (trimestres, meses, anos)</p>
        </div>
        <Button onClick={openNewDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Ciclo
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Lista de Ciclos</CardTitle>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum ciclo encontrado</p>
              <p className="text-sm">Crie seu primeiro ciclo para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Chave</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map(cycle => (
                  <TableRow key={cycle.id}>
                    <TableCell className="font-medium">{cycle.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cycle.key}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(cycle.startDate)}</TableCell>
                    <TableCell>{formatDate(cycle.endDate)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(cycle.status?.key || '')}>
                        {cycle.status?.name || 'Sem status'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cycle)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cycle.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCycle ? 'Editar Ciclo' : 'Novo Ciclo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nome</label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Q1 2026"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Chave</label>
                <Input
                  value={formData.key}
                  onChange={e => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
                  placeholder="Ex: Q1"
                  maxLength={10}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Data Início</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Data Fim</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={formData.statusId}
                onValueChange={value => setFormData({ ...formData, statusId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
