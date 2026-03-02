-- Create enums for org access grants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrgAccessGranteeType') THEN
    CREATE TYPE "OrgAccessGranteeType" AS ENUM ('ROLE', 'USER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrgAccessPermission') THEN
    CREATE TYPE "OrgAccessPermission" AS ENUM ('VIEW', 'EDIT');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "org_node_access_grants" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orgNodeId" TEXT NOT NULL,
  "granteeType" "OrgAccessGranteeType" NOT NULL,
  "granteeId" TEXT NOT NULL,
  "permission" "OrgAccessPermission" NOT NULL,
  "includeDescendants" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "org_node_access_grants_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "org_node_access_grants_tenantId_idx" ON "org_node_access_grants"("tenantId");
CREATE INDEX IF NOT EXISTS "org_node_access_grants_orgNodeId_idx" ON "org_node_access_grants"("orgNodeId");
CREATE INDEX IF NOT EXISTS "org_node_access_grants_granteeType_granteeId_idx" ON "org_node_access_grants"("granteeType", "granteeId");

CREATE UNIQUE INDEX IF NOT EXISTS "org_node_access_grants_unique_scope_idx"
ON "org_node_access_grants"("tenantId", "orgNodeId", "granteeType", "granteeId", "permission");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_node_access_grants_tenantId_fkey'
  ) THEN
    ALTER TABLE "org_node_access_grants"
    ADD CONSTRAINT "org_node_access_grants_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'org_node_access_grants_orgNodeId_fkey'
  ) THEN
    ALTER TABLE "org_node_access_grants"
    ADD CONSTRAINT "org_node_access_grants_orgNodeId_fkey"
    FOREIGN KEY ("orgNodeId") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
