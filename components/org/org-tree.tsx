'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface OrgNode {
  id: string
  name: string
  type: { name: string }
  leader?: { id: string; name: string }
  memberships: Array<{ user: { id: string; name: string } }>
  children: OrgNode[]
}

interface OrgTreeProps {
  tree: OrgNode[]
  userContext: {
    activeOrgNodeId?: string | null
    memberships: any[]
    primaryOrgNode?: any
  }
}

export function OrgTree({ tree, userContext }: OrgTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const TreeNode = ({ node, level = 0 }: { node: OrgNode; level?: number }) => {
    const isExpanded = expandedNodes.has(node.id)
    const isActive = userContext.activeOrgNodeId === node.id
    const isPrimary = userContext.primaryOrgNode?.id === node.id
    const hasChildren = node.children.length > 0

    return (
      <div>
        <Card className={`mb-2 ${isActive ? 'ring-2 ring-primary' : ''} ${isPrimary ? 'border-primary' : ''}`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {hasChildren && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(node.id)}
                    className="p-1 h-6 w-6"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                )}
                {!hasChildren && <div className="w-6" />}
                <div>
                  <div className="font-medium">{node.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {node.type.name}
                    {node.leader && ` • Líder: ${node.leader.name}`}
                    {isPrimary && ' (Primário)'}
                  </div>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                  <Plus className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="p-1 h-6 w-6">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="p-1 h-6 w-6 text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {node.memberships.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                Membros: {node.memberships.map(m => m.user.name).join(', ')}
              </div>
            )}
          </CardContent>
        </Card>
        {isExpanded && hasChildren && (
          <div className="ml-6">
            {node.children.map(child => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum nó organizacional encontrado. Comece criando um nó raiz.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {tree.map(node => (
        <TreeNode key={node.id} node={node} />
      ))}
    </div>
  )
}