import { KRThresholdDirection, KRType } from '@prisma/client'

export type KRComputedStatus = 'ACHIEVED' | 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK'

export interface KRMetricsInput {
  type: KRType
  targetValue: number | null
  baselineValue: number | null
  thresholdValue: number | null
  thresholdDirection: KRThresholdDirection | null
  currentValue: number | null
  checklistJson: unknown
}

export interface KRMetricsResult {
  progress: number
  isAchieved: boolean
  statusComputed: KRComputedStatus
}

interface ChecklistItem {
  id: string
  title: string
  done: boolean
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function parseChecklist(value: unknown): ChecklistItem[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is ChecklistItem => {
    if (!item || typeof item !== 'object') return false
    const asObj = item as Record<string, unknown>
    return (
      typeof asObj.id === 'string' &&
      typeof asObj.title === 'string' &&
      typeof asObj.done === 'boolean'
    )
  })
}

function getStatusFromProgress(progress: number): KRComputedStatus {
  if (progress >= 100) return 'ACHIEVED'
  if (progress >= 70) return 'ON_TRACK'
  if (progress >= 40) return 'AT_RISK'
  return 'OFF_TRACK'
}

function calculateIncrease(input: KRMetricsInput): KRMetricsResult {
  const current = input.currentValue ?? 0
  const target = input.targetValue ?? 0
  const baseline = input.baselineValue

  const denominator = baseline !== null && baseline !== undefined
    ? target - baseline
    : target
  const numerator = baseline !== null && baseline !== undefined
    ? current - baseline
    : current

  const progress = denominator <= 0 ? 0 : clamp((numerator / denominator) * 100)
  const isAchieved = current >= target && target > 0

  return {
    progress,
    isAchieved,
    statusComputed: isAchieved ? 'ACHIEVED' : getStatusFromProgress(progress),
  }
}

function calculateDecrease(input: KRMetricsInput): KRMetricsResult {
  const baseline = input.baselineValue ?? 0
  const target = input.targetValue ?? 0
  const current = input.currentValue ?? baseline

  const denominator = baseline - target
  const numerator = baseline - current
  const progress = denominator <= 0 ? 0 : clamp((numerator / denominator) * 100)
  const isAchieved = current <= target

  return {
    progress,
    isAchieved,
    statusComputed: isAchieved ? 'ACHIEVED' : getStatusFromProgress(progress),
  }
}

function calculateDeliverable(input: KRMetricsInput): KRMetricsResult {
  const checklist = parseChecklist(input.checklistJson)
  if (checklist.length === 0) {
    return { progress: 0, isAchieved: false, statusComputed: 'OFF_TRACK' }
  }

  const doneCount = checklist.filter(item => item.done).length
  const progress = clamp((doneCount / checklist.length) * 100)
  const isAchieved = doneCount === checklist.length

  return {
    progress,
    isAchieved,
    statusComputed: isAchieved ? 'ACHIEVED' : getStatusFromProgress(progress),
  }
}

function calculateThreshold(input: KRMetricsInput): KRMetricsResult {
  const direction = input.thresholdDirection ?? KRThresholdDirection.MAXIMO
  const thresholdValue = input.thresholdValue ?? 0
  const current = input.currentValue ?? 0

  const isAchieved = direction === KRThresholdDirection.MAXIMO
    ? current <= thresholdValue
    : current >= thresholdValue

  return {
    progress: isAchieved ? 100 : 0,
    isAchieved,
    statusComputed: isAchieved ? 'ACHIEVED' : 'OFF_TRACK',
  }
}

export function calculateKRMetrics(input: KRMetricsInput): KRMetricsResult {
  switch (input.type) {
    case KRType.AUMENTO:
      return calculateIncrease(input)
    case KRType.REDUCAO:
      return calculateDecrease(input)
    case KRType.ENTREGAVEL:
      return calculateDeliverable(input)
    case KRType.LIMIAR:
      return calculateThreshold(input)
    default:
      return { progress: 0, isAchieved: false, statusComputed: 'OFF_TRACK' }
  }
}
