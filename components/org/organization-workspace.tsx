'use client'

import { useMemo, useState } from 'react'
import { OrgTree } from '@/components/org/org-tree'
import { OrgNodePanel } from '@/components/org/org-node-panel'

interface OrgNode {
  id: string
  name: string
  type: { name: string }
  leader?: { id: string; name: string }
  memberships: Array<{ user: { id: string; name: string } }>
  children: OrgNode[]
}

interface OrganizationWorkspaceProps {
  tree: OrgNode[]
  userContext: {
    activeOrgNodeId?: string | null
    memberships: any[]
    primaryOrgNode?: any
  }
  canManageGrants: boolean
  canManageStructure: boolean
}

function flattenTree(nodes: OrgNode[]): OrgNode[] {
  const result: OrgNode[] = []

  const walk = (items: OrgNode[]) => {
    items.forEach((node) => {
      result.push(node)
      if (node.children?.length) {
        walk(node.children)
      }
    })
  }

  walk(nodes)
  return result
}

export function OrganizationWorkspace({ tree, userContext, canManageGrants, canManageStructure }: OrganizationWorkspaceProps) {
  const nodes = useMemo(() => flattenTree(tree), [tree])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    userContext.activeOrgNodeId || userContext.primaryOrgNode?.id || nodes[0]?.id || null,
  )

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  )

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-muted-foreground">
        O contexto de trabalho agora e controlado no seletor do topo da aplicacao.
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Árvore Organizacional</h2>
          <OrgTree
            tree={tree}
            userContext={userContext}
            selectedNodeId={selectedNodeId}
            onSelectNode={(node) => setSelectedNodeId(node.id)}
            canManageStructure={canManageStructure}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Detalhes do Nó</h2>
          <OrgNodePanel selectedNode={selectedNode} canManageGrants={canManageGrants} />
        </div>
      </div>
    </div>
  )
}
