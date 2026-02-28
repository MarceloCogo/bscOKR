'use client'

import { Button } from '@/components/ui/button'
import { Target, X } from 'lucide-react'

interface ObjectiveKRPanelProps {
  objective: {
    id: string
    title: string
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  cycles?: { id: string; name: string }[]
}

export function ObjectiveKRPanel({ objective, open, onOpenChange, cycles = [] }: ObjectiveKRPanelProps) {
  return (
    <div className="flex flex-col h-full bg-white border-l border-neutral-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-50">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Target className="w-5 h-5" />
          {objective?.title || 'Key Results'}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-center py-12">
          <Target className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Painel de KRs
          </h3>
          <p className="text-sm text-gray-500">
            Funcionalidades em desenvolvimento
          </p>
        </div>
      </div>
    </div>
  )
}
