'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

interface KRUpdateModalProps {
  kr: {
    id: string
    title: string
    currentValue: number
    unit: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (newValue: number) => void
}

export function KRUpdateModal({ kr, open, onOpenChange, onUpdate }: KRUpdateModalProps) {
  const [currentValue, setCurrentValue] = useState(kr.currentValue.toString())
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    const newValue = parseFloat(currentValue)

    if (isNaN(newValue) || newValue < 0) {
      toast.error('Valor deve ser um número positivo')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/kr/${kr.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentValue: newValue }),
      })

      if (response.ok) {
        toast.success('KR atualizado com sucesso!')
        onUpdate(newValue)
        onOpenChange(false)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao atualizar KR')
      }
    } catch (error) {
      toast.error('Erro ao atualizar KR')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCurrentValue(kr.currentValue.toString())
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="kr-update-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" aria-hidden="true" />
            Atualizar Key Result
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {kr.title}
            </label>
            <p className="text-xs text-gray-500 mb-3" id="kr-update-description">
              Valor atual: {kr.currentValue} {kr.unit}
            </p>
          </div>

          <div>
            <label htmlFor="kr-value-input" className="text-sm font-medium mb-2 block">
              Novo valor atual ({kr.unit})
            </label>
            <Input
              id="kr-value-input"
              type="number"
              step="0.01"
              min="0"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder={`Ex: ${kr.currentValue + 10}`}
              className="text-center text-lg"
              aria-describedby="kr-update-description"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            aria-label="Cancelar atualização"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            aria-label="Confirmar atualização do Key Result"
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
