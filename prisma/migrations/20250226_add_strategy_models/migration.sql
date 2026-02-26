-- CreateTable
CREATE TABLE "objective_link_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "objective_link_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategic_objectives" (
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

-- CreateTable
CREATE TABLE "objective_responsibilities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "responsibilityRoleId" TEXT NOT NULL,
    "contributionWeight" INTEGER NOT NULL,

    CONSTRAINT "objective_responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objective_links" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromObjectiveId" TEXT NOT NULL,
    "toObjectiveId" TEXT NOT NULL,
    "linkTypeId" TEXT NOT NULL,

    CONSTRAINT "objective_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "strategic_objectives_tenantId_idx" ON "strategic_objectives"("tenantId");

-- CreateIndex
CREATE INDEX "objective_responsibilities_tenantId_idx" ON "objective_responsibilities"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "objective_link_types_tenantId_key_key" ON "objective_link_types"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "objective_responsibilities_objectiveId_entityType_entityId_responsibilityRoleId_key" ON "objective_responsibilities"("objectiveId", "entityType", "entityId", "responsibilityRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "objective_links_fromObjectiveId_toObjectiveId_linkTypeId_key" ON "objective_links"("fromObjectiveId", "toObjectiveId", "linkTypeId");

-- AddForeignKey
ALTER TABLE "objective_link_types" ADD CONSTRAINT "objective_link_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_perspectiveId_fkey" FOREIGN KEY ("perspectiveId") REFERENCES "perspectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "pillars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "objective_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_sponsorUserId_fkey" FOREIGN KEY ("sponsorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_orgNodeId_fkey" FOREIGN KEY ("orgNodeId") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_parentObjectiveId_fkey" FOREIGN KEY ("parentObjectiveId") REFERENCES "strategic_objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_responsibilities" ADD CONSTRAINT "objective_responsibilities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_responsibilities" ADD CONSTRAINT "objective_responsibilities_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "strategic_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_responsibilities" ADD CONSTRAINT "objective_responsibilities_responsibilityRoleId_fkey" FOREIGN KEY ("responsibilityRoleId") REFERENCES "responsibility_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_links" ADD CONSTRAINT "objective_links_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_links" ADD CONSTRAINT "objective_links_fromObjectiveId_fkey" FOREIGN KEY ("fromObjectiveId") REFERENCES "strategic_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_links" ADD CONSTRAINT "objective_links_toObjectiveId_fkey" FOREIGN KEY ("toObjectiveId") REFERENCES "strategic_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_links" ADD CONSTRAINT "objective_links_linkTypeId_fkey" FOREIGN KEY ("linkTypeId") REFERENCES "objective_link_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;