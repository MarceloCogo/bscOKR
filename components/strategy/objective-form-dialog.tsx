'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createObjectiveInRegion } from '@/lib/actions/strategy'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

interface Perspective {
  id: string
  name: string
}

interface Pillar {
  id: string
  name: string
}

interface ObjectiveStatus {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

interface ObjectiveFormDialogProps {
  perspectives: Perspective[]
  pillars: Pillar[]
  statuses: ObjectiveStatus[]
  users: User[]
  preselectedRegion?: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ObjectiveFormDialog({
  perspectives,
  pillars,
  statuses,
  users,
  preselectedRegion,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ObjectiveFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mapRegion: preselectedRegion || '',
    perspectiveId: '',
    pillarId: '',
    statusId: '',
    sponsorUserId: '',
  })

  const router = useRouter()

  // Set defaults when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        title: '',
        description: '',
        mapRegion: preselectedRegion || '',
        perspectiveId: perspectives[0]?.id || '',
        pillarId: '',
        statusId: statuses[0]?.id || '',
        sponsorUserId: users[0]?.id || '',
      })
    }
  }, [open, preselectedRegion, perspectives, statuses, users])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.mapRegion || !formData.perspectiveId || !formData.statusId) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    setLoading(true)

    try {
      await createObjectiveInRegion({
        mapRegion: formData.mapRegion,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        perspectiveId: formData.perspectiveId,
        pillarId: formData.pillarId || undefined,
        statusId: formData.statusId,
        sponsorUserId: formData.sponsorUserId,
      })

      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error('Error creating objective:', error)
      alert('Erro ao criar objetivo')
    } finally {
      setLoading(false)
    }
  }

  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Novo Objetivo
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar Novo Objetivo</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do novo objetivo estratégico.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Digite o título do objetivo"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição detalhada do objetivo (opcional)"
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="mapRegion">Região do Mapa *</Label>
              <Select
                value={formData.mapRegion}
                onValueChange={(value) => setFormData(prev => ({ ...prev, mapRegion: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a região" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AMBITION">Ambição Estratégica</SelectItem>
                  <SelectItem value="GROWTH_FOCUS">Focos Estratégicos de Crescimento</SelectItem>
                  <SelectItem value="VALUE_PROPOSITION">Proposta de Valor</SelectItem>
                  <SelectItem value="PILLAR_OFFER">Pilar - Oferta</SelectItem>
                  <SelectItem value="PILLAR_REVENUE">Pilar - Receita</SelectItem>
                  <SelectItem value="PILLAR_EFFICIENCY">Pilar - Eficiência</SelectItem>
                  <SelectItem value="PEOPLE_BASE">Base - Pessoas/Cultura/Talentos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="perspective">Perspectiva *</Label>
                <Select
                  value={formData.perspectiveId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, perspectiveId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {perspectives.map(perspective => (
                      <SelectItem key={perspective.id} value={perspective.id}>
                        {perspective.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="pillar">Pilar</Label>
                <Select
                  value={formData.pillarId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, pillarId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {pillars.map(pillar => (
                      <SelectItem key={pillar.id} value={pillar.id}>
                        {pillar.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.statusId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, statusId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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

              <div className="grid gap-2">
                <Label htmlFor="sponsor">Responsável *</Label>
                <Select
                  value={formData.sponsorUserId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sponsorUserId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar Objetivo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}