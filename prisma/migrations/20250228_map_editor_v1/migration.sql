-- Add mapRegion and orderIndex to strategic_objectives
ALTER TABLE "strategic_objectives" ADD COLUMN "mapRegion" TEXT NOT NULL DEFAULT 'PILLAR_OFFER';
ALTER TABLE "strategic_objectives" ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- Create strategy_map_meta table
CREATE TABLE "strategy_map_meta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orgNodeId" TEXT NOT NULL,
    "ambitionText" TEXT,
    "valuePropositionText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_map_meta_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "strategy_map_meta_tenantId_orgNodeId_key" ON "strategy_map_meta"("tenantId", "orgNodeId");

-- Add foreign keys
ALTER TABLE "strategy_map_meta" ADD CONSTRAINT "strategy_map_meta_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_map_meta" ADD CONSTRAINT "strategy_map_meta_orgNodeId_fkey" FOREIGN KEY ("orgNodeId") REFERENCES "org_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;