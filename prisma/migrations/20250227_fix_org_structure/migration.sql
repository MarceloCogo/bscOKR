-- This migration creates all missing tables for Phase 3 and 4
-- Uses IF NOT EXISTS to handle partial previous failures

-- Create org_nodes table (Phase 3)
CREATE TABLE IF NOT EXISTS "org_nodes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "parentId" TEXT,
    "leaderUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_nodes_pkey" PRIMARY KEY ("id")
);

-- Create org_node_memberships table (Phase 3)
CREATE TABLE IF NOT EXISTS "org_node_memberships" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orgNodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_node_memberships_pkey" PRIMARY KEY ("id")
);

-- Create user_preferences table (Phase 3)
CREATE TABLE IF NOT EXISTS "user_preferences" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeOrgNodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- Create objective_link_types table (Phase 4)
CREATE TABLE IF NOT EXISTS "objective_link_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "objective_link_types_pkey" PRIMARY KEY ("id")
);

-- Create strategic_objectives table (Phase 4)
CREATE TABLE IF NOT EXISTS "strategic_objectives" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "perspectiveId" TEXT NOT NULL,
    "pillarId" TEXT,
    "statusId" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "sponsorUserId" TEXT NOT NULL,
    "orgNodeId" TEXT NOT NULL,
    "parentObjectiveId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategic_objectives_pkey" PRIMARY KEY ("id")
);

-- Create objective_responsibilities table (Phase 4)
CREATE TABLE IF NOT EXISTS "objective_responsibilities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "responsibilityRoleId" TEXT NOT NULL,
    "contributionWeight" INTEGER NOT NULL,

    CONSTRAINT "objective_responsibilities_pkey" PRIMARY KEY ("id")
);

-- Create objective_links table (Phase 4)
CREATE TABLE IF NOT EXISTS "objective_links" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromObjectiveId" TEXT NOT NULL,
    "toObjectiveId" TEXT NOT NULL,
    "linkTypeId" TEXT NOT NULL,

    CONSTRAINT "objective_links_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "org_nodes_tenantId_idx" ON "org_nodes"("tenantId");
CREATE INDEX IF NOT EXISTS "org_node_memberships_tenantId_idx" ON "org_node_memberships"("tenantId");
CREATE INDEX IF NOT EXISTS "strategic_objectives_tenantId_idx" ON "strategic_objectives"("tenantId");
CREATE INDEX IF NOT EXISTS "objective_responsibilities_tenantId_idx" ON "objective_responsibilities"("tenantId");

-- Create unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_tenantId_userId_key" ON "user_preferences"("tenantId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "org_node_memberships_orgNodeId_userId_key" ON "org_node_memberships"("orgNodeId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "objective_link_types_tenantId_key_key" ON "objective_link_types"("tenantId", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "objective_responsibilities_objectiveId_entityType_entityId_responsibilityRoleId_key" ON "objective_responsibilities"("objectiveId", "entityType", "entityId", "responsibilityRoleId");
CREATE UNIQUE INDEX IF NOT EXISTS "objective_links_fromObjectiveId_toObjectiveId_linkTypeId_key" ON "objective_links"("fromObjectiveId", "toObjectiveId", "linkTypeId");

-- Add foreign keys (these will fail if FK already exists, which is OK)
ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "org_node_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "org_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "org_nodes" ADD CONSTRAINT "org_nodes_leaderUserId_fkey" FOREIGN KEY ("leaderUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "org_node_memberships" ADD CONSTRAINT "org_node_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_node_memberships" ADD CONSTRAINT "org_node_memberships_orgNodeId_fkey" FOREIGN KEY ("orgNodeId") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "org_node_memberships" ADD CONSTRAINT "org_node_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "objective_link_types" ADD CONSTRAINT "objective_link_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_perspectiveId_fkey" FOREIGN KEY ("perspectiveId") REFERENCES "perspectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "pillars"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "objective_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_sponsorUserId_fkey" FOREIGN KEY ("sponsorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_orgNodeId_fkey" FOREIGN KEY ("orgNodeId") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_parentObjectiveId_fkey" FOREIGN KEY ("parentObjectiveId") REFERENCES "strategic_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "objective_responsibilities" ADD CONSTRAINT "objective_responsibilities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "objective_responsibilities" ADD CONSTRAINT "objective_responsibilities_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "strategic_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "objective_responsibilities" ADD CONSTRAINT "objective_responsibilities_responsibilityRoleId_fkey" FOREIGN KEY ("responsibilityRoleId") REFERENCES "responsibility_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "objective_links" ADD CONSTRAINT "objective_links_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "objective_links" ADD CONSTRAINT "objective_links_fromObjectiveId_fkey" FOREIGN KEY ("fromObjectiveId") REFERENCES "strategic_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "objective_links" ADD CONSTRAINT "objective_links_toObjectiveId_fkey" FOREIGN KEY ("toObjectiveId") REFERENCES "strategic_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "objective_links" ADD CONSTRAINT "objective_links_linkTypeId_fkey" FOREIGN KEY ("linkTypeId") REFERENCES "objective_link_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;