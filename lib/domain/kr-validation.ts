import { KRThresholdDirection, KRType, KRUnit } from '@prisma/client'
import { z } from 'zod'

const checklistItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  done: z.boolean(),
})

const baseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  cycleId: z.string().optional().nullable(),
  statusId: z.string().optional().nullable(),
  dueDate: z.coerce.date(),
  type: z.nativeEnum(KRType),
})

const increaseSchema = baseSchema.extend({
  type: z.literal(KRType.AUMENTO),
  targetValue: z.number(),
  currentValue: z.number(),
  unit: z.nativeEnum(KRUnit),
  baselineValue: z.number().optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.baselineValue !== undefined && value.baselineValue !== null && value.targetValue <= value.baselineValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'targetValue deve ser maior que baselineValue para AUMENTO',
      path: ['targetValue'],
    })
  }
})

const decreaseSchema = baseSchema.extend({
  type: z.literal(KRType.REDUCAO),
  baselineValue: z.number(),
  targetValue: z.number(),
  currentValue: z.number(),
  unit: z.nativeEnum(KRUnit),
}).superRefine((value, ctx) => {
  if (value.targetValue >= value.baselineValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'targetValue deve ser menor que baselineValue para REDUCAO',
      path: ['targetValue'],
    })
  }
})

const deliverableSchema = baseSchema.extend({
  type: z.literal(KRType.ENTREGAVEL),
  checklistJson: z.array(checklistItemSchema).min(1),
})

const thresholdSchema = baseSchema.extend({
  type: z.literal(KRType.LIMIAR),
  thresholdValue: z.number(),
  currentValue: z.number(),
  unit: z.nativeEnum(KRUnit),
  thresholdDirection: z.nativeEnum(KRThresholdDirection).default(KRThresholdDirection.MAXIMO),
})

export const createKRSchema = z.discriminatedUnion('type', [
  increaseSchema,
  decreaseSchema,
  deliverableSchema,
  thresholdSchema,
])

export const updateKRSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  type: z.nativeEnum(KRType).optional(),
  dueDate: z.coerce.date().optional(),
  targetValue: z.number().optional().nullable(),
  baselineValue: z.number().optional().nullable(),
  thresholdValue: z.number().optional().nullable(),
  thresholdDirection: z.nativeEnum(KRThresholdDirection).optional().nullable(),
  currentValue: z.number().optional().nullable(),
  unit: z.nativeEnum(KRUnit).optional().nullable(),
  checklistJson: z.array(checklistItemSchema).optional().nullable(),
  cycleId: z.string().optional().nullable(),
  statusId: z.string().optional().nullable(),
  orderIndex: z.number().optional(),
})

type KRPayload = z.infer<typeof createKRSchema> | z.infer<typeof updateKRSchema>

export function sanitizeKRPayloadByType<T extends KRPayload>(payload: T): T {
  const cloned = { ...payload } as Record<string, unknown>
  const type = cloned.type as KRType | undefined

  if (!type) return payload

  if (type === KRType.ENTREGAVEL) {
    cloned.targetValue = null
    cloned.baselineValue = null
    cloned.thresholdValue = null
    cloned.thresholdDirection = null
    cloned.currentValue = null
    cloned.unit = null
  }

  if (type === KRType.AUMENTO || type === KRType.REDUCAO) {
    cloned.checklistJson = null
    cloned.thresholdValue = null
    cloned.thresholdDirection = null
  }

  if (type === KRType.LIMIAR) {
    cloned.targetValue = null
    cloned.baselineValue = null
    cloned.checklistJson = null
  }

  return cloned as T
}
