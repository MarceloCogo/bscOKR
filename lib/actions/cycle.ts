'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth'

interface CreateCycleInput {
  name: string
  key: string
  startDate: Date
  endDate: Date
  statusId?: string
}

interface UpdateCycleInput {
  name?: string
  key?: string
  startDate?: Date
  endDate?: Date
  isActive?: boolean
  statusId?: string
}

export async function createCycle(input: CreateCycleInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  // Get max order index
  const maxOrder = await prisma.cycle.aggregate({
    where: { tenantId: session.user.tenantId },
    _max: { orderIndex: true },
  })

  const cycle = await prisma.cycle.create({
    data: {
      tenantId: session.user.tenantId,
      name: input.name,
      key: input.key,
      startDate: input.startDate,
      endDate: input.endDate,
      statusId: input.statusId,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
    include: {
      status: true,
    },
  })

  revalidatePath('/app/admin/config')
  return cycle
}

export async function updateCycle(id: string, input: UpdateCycleInput) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  // Verify cycle belongs to tenant
  const existing = await prisma.cycle.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  if (!existing) {
    throw new Error('Cycle not found')
  }

  // If activating this cycle, deactivate others
  if (input.isActive) {
    await prisma.cycle.updateMany({
      where: {
        tenantId: session.user.tenantId,
        id: { not: id },
      },
      data: { isActive: false },
    })
  }

  const cycle = await prisma.cycle.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.key && { key: input.key }),
      ...(input.startDate && { startDate: input.startDate }),
      ...(input.endDate && { endDate: input.endDate }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.statusId !== undefined && { statusId: input.statusId }),
    },
    include: {
      status: true,
    },
  })

  revalidatePath('/app/admin/config')
  return cycle
}

export async function deleteCycle(id: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const existing = await prisma.cycle.findFirst({
    where: {
      id,
      tenantId: session.user.tenantId,
    },
  })

  if (!existing) {
    throw new Error('Cycle not found')
  }

  await prisma.cycle.delete({
    where: { id },
  })

  revalidatePath('/app/admin/config')
}

export async function getCycles() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const cycles = await prisma.cycle.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      status: true,
    },
    orderBy: { orderIndex: 'asc' },
  })

  return cycles
}

export async function getActiveCycle() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const cycle = await prisma.cycle.findFirst({
    where: {
      tenantId: session.user.tenantId,
      isActive: true,
    },
    include: {
      status: true,
    },
  })

  return cycle
}

export async function setActiveCycle(cycleId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  // Deactivate all cycles
  await prisma.cycle.updateMany({
    where: { tenantId: session.user.tenantId },
    data: { isActive: false },
  })

  // Activate the selected cycle
  const cycle = await prisma.cycle.update({
    where: { id: cycleId },
    data: { isActive: true },
  })

  revalidatePath('/app/admin/config')
  return cycle
}

export async function generateCycles(key: string, count: number = 4) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized')
  }

  const now = new Date()
  const year = now.getFullYear()
  
  const cycleConfigs: { [key: string]: { months: number[]; name: (m: number, y: number) => string } } = {
    monthly: {
      months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      name: (m: number, y: number) => {
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        return `${months[m]} ${y}`
      }
    },
    quarterly: {
      months: [0, 3, 6, 9],
      name: (m: number, y: number) => `Q${(m / 3) + 1} ${y}`
    },
    semester: {
      months: [0, 6],
      name: (m: number, y: number) => `${m === 0 ? '1º' : '2º'} Semestre ${y}`
    },
    yearly: {
      months: [0],
      name: () => `Ano ${year}`
    },
  }

  const config = cycleConfigs[key]
  if (!config) {
    throw new Error('Invalid cycle key')
  }

  const cycles = []
  const baseDate = new Date(year, 0, 1)

  for (let i = 0; i < count; i++) {
    const monthIndex = config.months[i % config.months.length]
    const cycleYear = year + Math.floor((config.months.length > 1 ? i : i / config.months.length))
    
    const startDate = new Date(cycleYear, monthIndex, 1)
    const nextMonthIndex = config.months[(i + 1) % config.months.length]
    const nextYear = config.months.length > 1 && nextMonthIndex < monthIndex ? cycleYear + 1 : cycleYear
    const endDate = new Date(nextYear, nextMonthIndex, 0) // Last day of month

    const cycle = await prisma.cycle.create({
      data: {
        tenantId: session.user.tenantId,
        name: config.name(monthIndex, cycleYear),
        key,
        startDate,
        endDate,
        orderIndex: i,
        isActive: i === 0 && key === 'quarterly', // First cycle active by default
      },
    })
    cycles.push(cycle)
  }

  revalidatePath('/app/admin/config')
  return cycles
}
