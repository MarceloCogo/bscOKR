'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function OrgNodePanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Selecione um nó</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Clique em um nó na árvore à esquerda para ver seus detalhes e gerenciar membros.
        </p>
      </CardContent>
    </Card>
  )
}