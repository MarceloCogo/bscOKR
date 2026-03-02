'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getUserOrgContext } from '@/lib/actions/org'
import { toast } from 'sonner'

interface UserContext {
  activeOrgNodeId?: string | null
  memberships: Array<{
    orgNode: {
      id: string
      name: string
      type: { name: string }
    }
  }>
  primaryOrgNode?: {
    id: string
    name: string
  } | null
}

export function OrgContextSelector() {
  const [context, setContext] = useState<UserContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedContext, setSelectedContext] = useState('')
  const [updating, setUpdating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadContext()
  }, [])

  const loadContext = async () => {
    try {
      const ctx = await getUserOrgContext()
      setContext(ctx)
      setSelectedContext(ctx.activeOrgNodeId || ctx.primaryOrgNode?.id || '')
    } catch (error) {
      console.error('Failed to load org context:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContextChange = async (orgNodeId: string) => {
    if (updating) return

    window.dispatchEvent(new CustomEvent('org-context-changing', { detail: { orgNodeId } }))
    setSelectedContext(orgNodeId)
    setUpdating(true)

    try {
      const response = await fetch('/api/org/set-active-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgNodeId }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Erro ao alterar contexto')
      }

      await loadContext()
      router.refresh()
      window.dispatchEvent(new Event('org-context-changed'))
    } catch (error) {
      console.error('Failed to update org context:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar contexto')
      window.dispatchEvent(new Event('org-context-change-ended'))
    } finally {
      setUpdating(false)
    }
  }



  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>
  }

  if (!context) {
    return null
  }

  if (context.memberships.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Contexto:</span>
      <Select value={selectedContext} onValueChange={handleContextChange}>
        <SelectTrigger className="h-8 min-w-[220px] text-sm" disabled={updating}>
          <SelectValue placeholder="Selecione o contexto" />
        </SelectTrigger>
        <SelectContent>
          {context.memberships.map((membership) => (
            <SelectItem key={membership.orgNode.id} value={membership.orgNode.id}>
              {membership.orgNode.name} ({membership.orgNode.type.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
