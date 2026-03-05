'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  availableNodes?: Array<{
    id: string
    name: string
    type: { name: string }
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

  const loadContext = useCallback(async () => {
    try {
      const response = await fetch('/api/user/context', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Erro ao carregar contexto')
      }

      const ctx = await response.json()
      setContext(ctx)
      setSelectedContext(ctx.activeOrgNodeId || ctx.primaryOrgNode?.id || '')
    } catch (error) {
      console.error('Failed to load org context:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadContext()
  }, [loadContext])

  useEffect(() => {
    const handleContextSync = () => {
      void loadContext()
    }

    window.addEventListener('org-context-changed', handleContextSync)

    return () => {
      window.removeEventListener('org-context-changed', handleContextSync)
    }
  }, [loadContext])

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

  const availableNodes = context.availableNodes || context.memberships.map((membership) => membership.orgNode)

  if (availableNodes.length === 0) {
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
          {availableNodes.map((node) => (
            <SelectItem key={node.id} value={node.id}>
              {node.name} ({node.type.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
