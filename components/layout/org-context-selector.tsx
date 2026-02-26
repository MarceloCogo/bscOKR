'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getUserOrgContext } from '@/lib/actions/org'

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

  useEffect(() => {
    loadContext()
  }, [])

  const loadContext = async () => {
    try {
      const ctx = await getUserOrgContext()
      setContext(ctx)
    } catch (error) {
      console.error('Failed to load org context:', error)
    } finally {
      setLoading(false)
    }
  }



  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>
  }

  if (!context) {
    return null
  }

  const currentOrgNode = context.memberships.find(m => m.orgNode.id === context.activeOrgNodeId)?.orgNode

  const displayText = currentOrgNode
    ? `${currentOrgNode.name} (${currentOrgNode.type.name})`
    : context.primaryOrgNode
    ? `${context.primaryOrgNode.name} (Primário)`
    : 'Sem contexto'

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Contexto:</span>
      <Button variant="outline" size="sm" className="text-sm">
        {displayText}
      </Button>
    </div>
  )
}