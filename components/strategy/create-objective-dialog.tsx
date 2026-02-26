'use client'

import { Button } from '@/components/ui/button'
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

interface OrgNode {
  id: string
  name: string
  type: { name: string }
}

interface CreateObjectiveDialogProps {
  perspectives: Perspective[]
  pillars: Pillar[]
  statuses: ObjectiveStatus[]
  orgNodes: OrgNode[]
}

export function CreateObjectiveDialog({
  perspectives,
  pillars,
  statuses,
  orgNodes,
}: CreateObjectiveDialogProps) {
  const handleClick = () => {
    // Placeholder: implement modal with form
    alert('Funcionalidade de criar objetivo será implementada (usa createObjective action)')
  }

  return (
    <Button onClick={handleClick}>
      <Plus className="h-4 w-4 mr-2" />
      Novo Objetivo
    </Button>
  )
}