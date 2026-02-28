'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface KRItem {
  id: string
  title: string
  type: 'AUMENTO' | 'REDUCAO' | 'ENTREGAVEL' | 'LIMIAR'
  dueDate: string
  targetValue: number | null
  baselineValue: number | null
  thresholdValue: number | null
  thresholdDirection: 'MAXIMO' | 'MINIMO' | null
  currentValue: number | null
  unit: 'PERCENTUAL' | 'BRL' | 'USD' | 'EUR' | 'UNIDADE' | null
}

interface KREditDialogProps {
  kr: KRItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void>
}

export function KREditDialog({ kr, open, onOpenChange, onSaved }: KREditDialogProps) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    dueDate: '',
    targetValue: '',
    baselineValue: '',
    thresholdValue: '',
    thresholdDirection: 'MAXIMO' as 'MAXIMO' | 'MINIMO',
    currentValue: '',
    unit: 'PERCENTUAL' as 'PERCENTUAL' | 'BRL' | 'USD' | 'EUR' | 'UNIDADE',
  })

  useEffect(() => {
    if (!kr || !open) return

    setForm({
      title: kr.title,
      dueDate: kr.dueDate ? new Date(kr.dueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      targetValue: kr.targetValue != null ? String(kr.targetValue) : '',
      baselineValue: kr.baselineValue != null ? String(kr.baselineValue) : '',
      thresholdValue: kr.thresholdValue != null ? String(kr.thresholdValue) : '',
      thresholdDirection: kr.thresholdDirection || 'MAXIMO',
      currentValue: kr.currentValue != null ? String(kr.currentValue) : '0',
      unit: (kr.unit as 'PERCENTUAL' | 'BRL' | 'USD' | 'EUR' | 'UNIDADE') || 'PERCENTUAL',
    })
  }, [kr, open])

  if (!kr) return null

  const parseNumber = (value: string) => {
    if (!value.trim()) return null
    const parsed = Number(value)
    return Number.isNaN(parsed) ? null : parsed
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Informe o titulo da KR')
      return
    }

    const payload: Record<string, string | number | null> = {
      title: form.title.trim(),
      dueDate: form.dueDate,
      referenceMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    }

    if (kr.type === 'AUMENTO') {
      const targetValue = parseNumber(form.targetValue)
      const currentValue = parseNumber(form.currentValue)
      if (targetValue == null || currentValue == null) {
        toast.error('Target e Current sao obrigatorios')
        return
      }
      payload.targetValue = targetValue
      payload.currentValue = currentValue
      payload.baselineValue = parseNumber(form.baselineValue)
      payload.unit = form.unit
    }

    if (kr.type === 'REDUCAO') {
      const baselineValue = parseNumber(form.baselineValue)
      const targetValue = parseNumber(form.targetValue)
      const currentValue = parseNumber(form.currentValue)
      if (baselineValue == null || targetValue == null || currentValue == null) {
        toast.error('Baseline, Target e Current sao obrigatorios')
        return
      }
      payload.baselineValue = baselineValue
      payload.targetValue = targetValue
      payload.currentValue = currentValue
      payload.unit = form.unit
    }

    if (kr.type === 'LIMIAR') {
      const thresholdValue = parseNumber(form.thresholdValue)
      const currentValue = parseNumber(form.currentValue)
      if (thresholdValue == null || currentValue == null) {
        toast.error('Limiar e Current sao obrigatorios')
        return
      }
      payload.thresholdValue = thresholdValue
      payload.currentValue = currentValue
      payload.thresholdDirection = form.thresholdDirection
      payload.unit = form.unit
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/kr/${kr.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error?.formErrors?.[0] || data.error || 'Erro ao salvar KR')
      }

      await onSaved()
      toast.success('KR atualizada com sucesso')
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar KR')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Editar KR</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium">Tipo</label>
            <Input value={kr.type} disabled />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Titulo</label>
            <Input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Due date</label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
          </div>

          {kr.type !== 'ENTREGAVEL' && (
            <div>
              <label className="mb-1 block text-xs font-medium">Unidade</label>
                <select
                  className="h-9 w-full rounded border px-2"
                  value={form.unit}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      unit: e.target.value as 'PERCENTUAL' | 'BRL' | 'USD' | 'EUR' | 'UNIDADE',
                    }))
                  }
                >
                <option value="PERCENTUAL">Percentual</option>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="UNIDADE">Unidade</option>
              </select>
            </div>
          )}

          {kr.type === 'AUMENTO' && (
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Baseline" type="number" value={form.baselineValue} onChange={(e) => setForm((prev) => ({ ...prev, baselineValue: e.target.value }))} />
              <Input placeholder="Target" type="number" value={form.targetValue} onChange={(e) => setForm((prev) => ({ ...prev, targetValue: e.target.value }))} />
              <Input placeholder="Current" type="number" value={form.currentValue} onChange={(e) => setForm((prev) => ({ ...prev, currentValue: e.target.value }))} />
            </div>
          )}

          {kr.type === 'REDUCAO' && (
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Baseline" type="number" value={form.baselineValue} onChange={(e) => setForm((prev) => ({ ...prev, baselineValue: e.target.value }))} />
              <Input placeholder="Target" type="number" value={form.targetValue} onChange={(e) => setForm((prev) => ({ ...prev, targetValue: e.target.value }))} />
              <Input placeholder="Current" type="number" value={form.currentValue} onChange={(e) => setForm((prev) => ({ ...prev, currentValue: e.target.value }))} />
            </div>
          )}

          {kr.type === 'LIMIAR' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Limiar" type="number" value={form.thresholdValue} onChange={(e) => setForm((prev) => ({ ...prev, thresholdValue: e.target.value }))} />
                <Input placeholder="Current" type="number" value={form.currentValue} onChange={(e) => setForm((prev) => ({ ...prev, currentValue: e.target.value }))} />
              </div>
              <select
                className="h-9 w-full rounded border px-2"
                value={form.thresholdDirection}
                onChange={(e) => setForm((prev) => ({ ...prev, thresholdDirection: e.target.value as 'MAXIMO' | 'MINIMO' }))}
              >
                <option value="MAXIMO">Maximo (&lt;= limite)</option>
                <option value="MINIMO">Minimo (&gt;= limite)</option>
              </select>
            </div>
          )}

          {kr.type === 'ENTREGAVEL' && (
            <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              Checklist do entregavel continua editavel direto no painel lateral.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
