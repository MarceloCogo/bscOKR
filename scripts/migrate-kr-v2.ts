import { prisma } from '@/lib/db'

function inferType(kr: any): 'AUMENTO' | 'REDUCAO' | 'ENTREGAVEL' | 'LIMIAR' {
  const text = `${kr.title || ''} ${kr.description || ''}`.toLowerCase()

  if (text.includes('entregar') || text.includes('deliver') || text.includes('concluir') || text.includes('feito')) {
    return 'ENTREGAVEL'
  }

  if (text.includes('não ultrapassar') || text.includes('nao ultrapassar') || text.includes('limite') || text.includes('até no máximo')) {
    return 'LIMIAR'
  }

  if (text.includes('reduzir') || text.includes('diminuir') || text.includes('decrease')) {
    return 'REDUCAO'
  }

  return 'AUMENTO'
}

function inferUnit(unit: string | null): 'PERCENTUAL' | 'BRL' | 'USD' | 'EUR' | 'UNIDADE' {
  const normalized = (unit || '').toUpperCase()
  if (normalized === '%' || normalized === 'PERCENT' || normalized === 'PERCENTUAL') return 'PERCENTUAL'
  if (normalized === 'R$' || normalized === 'BRL' || normalized.includes('REAL')) return 'BRL'
  if (normalized === '$' || normalized === 'USD') return 'USD'
  if (normalized === 'EUR' || normalized === '€') return 'EUR'
  return 'UNIDADE'
}

async function run() {
  const keyResults = await prisma.keyResult.findMany()

  for (const kr of keyResults) {
    const type = inferType(kr as any)
    const dueDate = (kr as any).dueDate ?? kr.endDate ?? new Date()

    const data: any = {
      type,
      dueDate,
    }

    if (type === 'ENTREGAVEL') {
      data.checklistJson = [{
        id: crypto.randomUUID(),
        title: 'Item inicial migrado',
        done: false,
      }]
      data.targetValue = null
      data.baselineValue = null
      data.thresholdValue = null
      data.thresholdDirection = null
      data.currentValue = null
      data.unit = null
    }

    if (type === 'AUMENTO') {
      data.unit = inferUnit((kr as any).unit)
      data.targetValue = (kr as any).targetValue ?? 100
      data.currentValue = (kr as any).currentValue ?? 0
      data.baselineValue = (kr as any).baselineValue ?? null
      data.thresholdValue = null
      data.thresholdDirection = null
      data.checklistJson = null
    }

    if (type === 'REDUCAO') {
      data.unit = inferUnit((kr as any).unit)
      data.baselineValue = (kr as any).baselineValue ?? (kr as any).targetValue ?? 100
      data.targetValue = (kr as any).targetValue ?? 0
      data.currentValue = (kr as any).currentValue ?? data.baselineValue
      data.thresholdValue = null
      data.thresholdDirection = null
      data.checklistJson = null
    }

    if (type === 'LIMIAR') {
      data.unit = inferUnit((kr as any).unit)
      data.thresholdValue = (kr as any).thresholdValue ?? (kr as any).targetValue ?? 0
      data.thresholdDirection = (kr as any).thresholdDirection ?? 'MAXIMO'
      data.currentValue = (kr as any).currentValue ?? 0
      data.targetValue = null
      data.baselineValue = null
      data.checklistJson = null
    }

    await prisma.keyResult.update({
      where: { id: kr.id },
      data,
    } as any)
  }

  console.log(`Migrated ${keyResults.length} KRs to KR v2`)
}

run()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
