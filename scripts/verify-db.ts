import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function assertTable(tableName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) as "exists"`,
    tableName
  )

  if (!rows[0]?.exists) {
    throw new Error(`Missing table: ${tableName}`)
  }
}

async function assertColumn(tableName: string, columnName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) as "exists"`,
    tableName,
    columnName
  )

  if (!rows[0]?.exists) {
    throw new Error(`Missing column: ${tableName}.${columnName}`)
  }
}

async function main() {
  await assertTable('users')
  await assertColumn('users', 'mustChangePassword')
  await assertColumn('users', 'passwordChangedAt')

  await assertTable('strategic_objectives')
  await assertColumn('strategic_objectives', 'mapRegion')
  await assertColumn('strategic_objectives', 'orderIndex')

  console.log('[verify-db] Database schema checks passed')
}

main()
  .catch((error) => {
    console.error('[verify-db] Failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
