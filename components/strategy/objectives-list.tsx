'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface StrategicObjective {
  id: string
  title: string
  perspective: { name: string }
  pillar?: { name: string } | null
  status: { name: string; color?: string | null }
  sponsor: { name: string }
  weight: number
  orgNode: { name: string; type: { name: string } }
}

interface ObjectivesListProps {
  objectives: StrategicObjective[]
}

export function ObjectivesList({ objectives }: ObjectivesListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Objetivos</CardTitle>
      </CardHeader>
      <CardContent>
        {objectives.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum objetivo encontrado. Crie o primeiro objetivo usando o botão acima.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Perspectiva</TableHead>
                <TableHead>Pilar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Org Node</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {objectives.map(objective => (
                <TableRow key={objective.id}>
                  <TableCell className="font-medium">{objective.title}</TableCell>
                  <TableCell>{objective.perspective.name}</TableCell>
                  <TableCell>{objective.pillar?.name || '-'}</TableCell>
                  <TableCell>
                    <span
                      className="px-2 py-1 text-xs border rounded"
                      style={{ borderColor: objective.status.color || '#6b7280' }}
                    >
                      {objective.status.name}
                    </span>
                  </TableCell>
                  <TableCell>{objective.sponsor.name}</TableCell>
                  <TableCell>{objective.weight}%</TableCell>
                  <TableCell>{objective.orgNode.name} ({objective.orgNode.type.name})</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}