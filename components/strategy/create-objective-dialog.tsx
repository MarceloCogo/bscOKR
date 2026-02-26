'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createObjective } from '@/lib/actions/strategy'
import { getUserOrgContext } from '@/lib/actions/org'
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

interface OrgNode {
  id: string
  name: string
  type: { name: string }
}

interface User {
  id: string
  name: string
  email: string
}

interface CreateObjectiveDialogProps {
  perspectives: Perspective[]
  pillars: Pillar[]
  statuses: ObjectiveStatus[]
  orgNodes: OrgNode[]
  users: User[]
}

export function CreateObjectiveDialog({
  perspectives,
  pillars,
  statuses,
  orgNodes,
  users,
}: CreateObjectiveDialogProps) {
  const [open, setOpen] = useState(false)
  const [userContext, setUserContext] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      getUserOrgContext().then(setUserContext).catch(console.error)
    }
  }, [open])

  const handleClick = () => {
    // Simple form implementation
    const title = prompt('Título do objetivo:')
    if (!title) return

    const perspectiveId = prompt('ID da perspectiva (ou deixe vazio para primeira):', perspectives[0]?.id || '')
    const statusId = prompt('ID do status (ou deixe vazio para primeiro):', statuses[0]?.id || '')
    const sponsorUserId = prompt('ID do sponsor (ou deixe vazio para primeiro):', users[0]?.id || '')
    const orgNodeId = userContext?.activeOrgNodeId || prompt('ID do org node:', orgNodes[0]?.id || '')

    if (!perspectiveId || !statusId || !sponsorUserId || !orgNodeId) {
      alert('Campos obrigatórios não preenchidos')
      return
    }

    createObjective({
      title,
      perspectiveId,
      statusId,
      sponsorUserId,
      orgNodeId,
      weight: 100,
    }).then(() => {
      alert('Objetivo criado!')
      router.refresh()
    }).catch(error => {
      console.error('Error:', error)
      alert('Erro ao criar objetivo')
    })
  }

  return (
    <Button onClick={handleClick}>
      <Plus className="h-4 w-4 mr-2" />
      Novo Objetivo
    </Button>
  )
}