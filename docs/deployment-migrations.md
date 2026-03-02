# Deployment and Migrations

This project uses automatic migration handling in the build pipeline.

## Build flow

The `build` script runs the following steps in order:

1. `prisma validate`
2. `prisma generate`
3. `tsx scripts/prepare-migrations.ts`
4. `prisma migrate deploy`
5. `tsx scripts/verify-db.ts`
6. `next build`

## Why `prepare-migrations`

Some environments were historically created with `db push` and can already contain
objects from older migrations. The script marks specific legacy migrations as applied
if the schema objects already exist:

- `20250228_baseline_complete`
- `20250228_map_editor_v1`

This avoids deploy failures such as duplicate-column errors when migration history
is missing but database structure is already present.

## Required environment variables

- `DATABASE_URL` must point to the production database.

## Recovery checklist

If deploy fails in migration stage:

1. Check migration status: `npx prisma migrate status`
2. Check schema objects directly in DB.
3. If a migration SQL already exists in DB, mark as applied with:
   `npx prisma migrate resolve --applied <migration_name>`
4. Re-run deploy.
