'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { updateObjectivePartial, deleteObjective } from '@/lib/actions/strategy'
import { useRouter } from 'next/navigation'

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

interface StrategicObjective {
  id: string
  title: string
  description?: string
  mapRegion: string
  perspective: { id: string; name: string }
  pillar?: { id: string; name: string } | null
  status: { id: string; name: string }
  sponsor: { id: string; name: string }
}

interface ObjectiveEditDialogProps {
  objective: StrategicObjective
  perspectives: Perspective[]
  pillars: Pillar[]
  statuses: ObjectiveStatus[]
  users: User[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ObjectiveEditDialog({
  objective,
  perspectives,
  pillars,
  statuses,
  users,
  open,
  onOpenChange,
}: ObjectiveEditDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    perspectiveId: '',
    pillarId: '',
    statusId: '',
    sponsorUserId: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (open && objective) {
      setFormData({
        title: objective.title,
        description: objective.description || '',
        perspectiveId: objective.perspective.id,
        pillarId: objective.pillar?.id || '',
        statusId: objective.status.id,
        sponsorUserId: objective.sponsor.id,
      })
    }
  }, [open, objective])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.perspectiveId || !formData.statusId) {
      alert('Preencha todos os campos obrigatórios')
      return
    }

    setIsLoading(true)

    try {
      await updateObjectivePartial(objective.id, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        perspectiveId: formData.perspectiveId,
        pillarId: formData.pillarId || undefined,
        statusId: formData.statusId,
        sponsorUserId: formData.sponsorUserId,
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error updating objective:', error)
      alert('Erro ao atualizar objetivo')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este objetivo? Esta ação não pode ser desfeita.')) {
      return
    }

    setIsLoading(true)

    try {
      await deleteObjective(objective.id)
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Error deleting objective:', error)
      alert('Erro ao excluir objetivo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Objetivo</DialogTitle>
            <DialogDescription>
              Modifique os detalhes do objetivo estratégico.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editTitle">Título *</Label>
              <Input
                id="editTitle"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Digite o título do objetivo"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="editDescription">Descrição</Label>
              <Textarea
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição detalhada do objetivo (opcional)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="editPerspective">Perspectiva *</Label>
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
                <Label htmlFor="editPillar">Pilar</Label>
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
                <Label htmlFor="editStatus">Status *</Label>
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
                <Label htmlFor="editSponsor">Responsável *</Label>
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

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              Excluir Objetivo
            </Button>
            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}