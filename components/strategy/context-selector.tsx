'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRouter } from 'next/navigation'
import { Check, MapIcon } from 'lucide-react'

interface OrgNode {
  id: string
  name: string
  type: { name: string }
}

interface ContextSelectorProps {
  currentContext: OrgNode | null
  allContexts: OrgNode[]
  onContextChange: (orgNodeId: string) => void
}

export function ContextSelector({ currentContext, allContexts, onContextChange }: ContextSelectorProps) {
  const [selectedContext, setSelectedContext] = useState<string>(currentContext?.id || '')
  const router = useRouter()

  useEffect(() => {
    setSelectedContext(currentContext?.id || '')
  }, [currentContext])

  const handleContextChange = async (orgNodeId: string) => {
    setSelectedContext(orgNodeId)
    await onContextChange(orgNodeId)
    router.refresh()
  }

  if (allContexts.length <= 1) {
    return null // Não mostrar seletor se só há um contexto
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapIcon className="h-5 w-5" />
          Contexto Organizacional
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select value={selectedContext} onValueChange={handleContextChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um contexto" />
              </SelectTrigger>
              <SelectContent>
                {allContexts.map(node => (
                  <SelectItem key={node.id} value={node.id}>
                    <div className="flex items-center gap-2">
                      {node.id === currentContext?.id && <Check className="h-4 w-4 text-green-600" />}
                      <span>{node.name}</span>
                      <span className="text-sm text-muted-foreground">({node.type.name})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {currentContext ? `Ativo: ${currentContext.name}` : 'Nenhum contexto selecionado'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}