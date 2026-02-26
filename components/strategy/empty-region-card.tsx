'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus } from 'lucide-react'

interface EmptyRegionCardProps {
  title: string
  description: string
  onAddClick: () => void
  isLoading?: boolean
}

export function EmptyRegionCard({
  title,
  description,
  onAddClick,
  isLoading = false
}: EmptyRegionCardProps) {
  return (
    <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
      <CardContent className="p-6 text-center">
        <div className="space-y-3">
          <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <Plus className="h-6 w-6 text-gray-400" />
          </div>

          <div>
            <h3 className="font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          </div>

          <Button
            variant="outline"
            onClick={onAddClick}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Carregando...' : 'Adicionar Objetivo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}