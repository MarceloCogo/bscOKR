'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'

interface FormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number'
  placeholder?: string
  required?: boolean
}

interface ConfigFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => Promise<void>
  fields: FormField[]
  initialData?: any
  title: string
}

export function ConfigFormModal({
  isOpen,
  onClose,
  onSubmit,
  fields,
  initialData,
  title,
}: ConfigFormModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  // Create dynamic schema based on fields
  const schema = z.object(
    fields.reduce((acc, field) => {
      let fieldSchema: z.ZodType<any>

      if (field.type === 'number') {
        fieldSchema = z.number()
      } else {
        fieldSchema = z.string().min(1, `${field.label} é obrigatório`)
      }

      if (!field.required) {
        fieldSchema = fieldSchema.optional()
      }

      acc[field.name] = fieldSchema
      return acc
    }, {} as Record<string, z.ZodType<any>>)
  )

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: fields.reduce((acc, field) => {
      acc[field.name] = initialData?.[field.name] || (field.type === 'number' ? 0 : '')
      return acc
    }, {} as Record<string, any>),
  })

  // Reset form when initialData changes
  React.useEffect(() => {
    if (initialData) {
      fields.forEach(field => {
        form.setValue(field.name, initialData[field.name] || (field.type === 'number' ? 0 : ''))
      })
    } else {
      fields.forEach(field => {
        form.setValue(field.name, field.type === 'number' ? 0 : '')
      })
    }
  }, [initialData, fields, form])

  const handleSubmit = async (data: any) => {
    setIsLoading(true)
    try {
      await onSubmit(data)
    } catch (error) {
      // Error is handled by the parent component
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para {initialData ? 'editar' : 'criar'} o registro.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {fields.map((field) => (
              <FormField
                key={field.name}
                control={form.control}
                name={field.name}
                render={({ field: formField }) => (
                  <FormItem>
                    <FormLabel>{field.label}</FormLabel>
                    <FormControl>
                      {field.type === 'textarea' ? (
                        <Textarea
                          placeholder={field.placeholder}
                          {...formField}
                          onChange={(e) => formField.onChange(e.target.value)}
                        />
                      ) : field.type === 'number' ? (
                        <Input
                          type="number"
                          placeholder={field.placeholder}
                          {...formField}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => formField.onChange(Number(e.target.value))}
                        />
                      ) : (
                        <Input
                          placeholder={field.placeholder}
                          {...formField}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}