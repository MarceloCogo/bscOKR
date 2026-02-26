'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { createObjectiveInRegion } from '@/lib/actions/strategy'
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
  preselectedRegion?: string
  meta?: { ambitionText?: string | null; valuePropositionText?: string | null }
}

export function CreateObjectiveDialog({
  perspectives,
  pillars,
  statuses,
  orgNodes,
  users,
  preselectedRegion,
  meta,
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
    // Simple form implementation with region
    const title = prompt('Título do objetivo:')
    if (!title) return

    const mapRegionOptions = [
      { value: 'AMBITION', label: 'Ambição Estratégica', disabled: !!meta?.ambitionText },
      { value: 'GROWTH_FOCUS', label: 'Focos Estratégicos de Crescimento' },
      { value: 'VALUE_PROPOSITION', label: 'Proposta de Valor', disabled: !!meta?.valuePropositionText },
      { value: 'PILLAR_OFFER', label: 'Pilar - Oferta' },
      { value: 'PILLAR_REVENUE', label: 'Pilar - Receita' },
      { value: 'PILLAR_EFFICIENCY', label: 'Pilar - Eficiência' },
      { value: 'PEOPLE_BASE', label: 'Base - Pessoas/Cultura/Talentos' },
    ]

    const mapRegion = preselectedRegion || prompt(
      'Região do mapa:\n' + mapRegionOptions.map(opt => `${opt.value}: ${opt.label}${opt.disabled ? ' (já tem texto)' : ''}`).join('\n'),
      preselectedRegion || 'GROWTH_FOCUS'
    )

    if (!mapRegion) return

    const option = mapRegionOptions.find(opt => opt.value === mapRegion)
    if (option?.disabled) {
      alert('Esta região já tem texto definido. Edite o texto existente.')
      return
    }

    const perspectiveId = prompt('ID da perspectiva (ou deixe vazio para primeira):', perspectives[0]?.id || '')
    const statusId = prompt('ID do status (ou deixe vazio para primeiro):', statuses[0]?.id || '')
    const sponsorUserId = prompt('ID do sponsor (ou deixe vazio para primeiro):', users[0]?.id || '')

    if (!perspectiveId || !statusId || !sponsorUserId) {
      alert('Campos obrigatórios não preenchidos')
      return
    }

    createObjectiveInRegion({
      mapRegion,
      title,
      perspectiveId,
      statusId,
      sponsorUserId,
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