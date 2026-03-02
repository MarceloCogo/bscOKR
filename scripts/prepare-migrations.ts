import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    ) as "exists"`,
    tableName
  )
  return Boolean(rows[0]?.exists)
}

async function columnExists(tableName: string, columnName: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) as "exists"`,
    tableName,
    columnName
  )
  return Boolean(rows[0]?.exists)
}

type MigrationState = {
  exists: boolean
  applied: boolean
  failed: boolean
}

async function getMigrationState(migrationName: string): Promise<MigrationState> {
  const hasMigrationsTable = await tableExists('_prisma_migrations')
  if (!hasMigrationsTable) {
    return { exists: false, applied: false, failed: false }
  }

  const rows = await prisma.$queryRawUnsafe<
    Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>
  >(
    `SELECT migration_name, finished_at, rolled_back_at
     FROM "_prisma_migrations"
     WHERE migration_name = $1
     ORDER BY started_at DESC
     LIMIT 1`,
    migrationName
  )

  const migration = rows[0]
  if (!migration) {
    return { exists: false, applied: false, failed: false }
  }

  const applied = Boolean(migration.finished_at)
  const failed = !migration.finished_at && !migration.rolled_back_at
  return { exists: true, applied, failed }
}

function resolveMigration(migrationName: string) {
  console.log(`[prepare-migrations] Marking ${migrationName} as applied`)
  execSync(`npx prisma migrate resolve --applied ${migrationName}`, {
    stdio: 'inherit',
  })
}

function markMigrationRolledBack(migrationName: string) {
  console.log(`[prepare-migrations] Marking ${migrationName} as rolled back`)
  execSync(`npx prisma migrate resolve --rolled-back ${migrationName}`, {
    stdio: 'inherit',
  })
}

async function main() {
  // Legacy baseline: database created manually or via db push
  const baselineState = await getMigrationState('20250228_baseline_complete')
  if (baselineState.failed) {
    markMigrationRolledBack('20250228_baseline_complete')
  }

  const hasCoreSchema =
    (await tableExists('tenants')) &&
    (await tableExists('users')) &&
    (await tableExists('strategic_objectives'))

  if (!baselineState.applied && hasCoreSchema) {
    resolveMigration('20250228_baseline_complete')
  }

  // Legacy map editor migration: columns/table may already exist
  const mapEditorState = await getMigrationState('20250228_map_editor_v1')
  if (mapEditorState.failed) {
    markMigrationRolledBack('20250228_map_editor_v1')
  }

  const hasMapEditorSchema =
    (await columnExists('strategic_objectives', 'mapRegion')) &&
    (await columnExists('strategic_objectives', 'orderIndex')) &&
    (await tableExists('strategy_map_meta'))

  if (!mapEditorState.applied && hasMapEditorSchema) {
    resolveMigration('20250228_map_editor_v1')
  }
}

main()
  .catch((error) => {
    console.error('[prepare-migrations] Failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
