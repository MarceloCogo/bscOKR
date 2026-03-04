CREATE TABLE "scim_provisioning_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'entra',
  "operation" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "httpMethod" TEXT NOT NULL,
  "httpPath" TEXT NOT NULL,
  "httpStatus" INTEGER NOT NULL,
  "targetUserId" TEXT,
  "targetEmail" TEXT,
  "externalId" TEXT,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "scim_provisioning_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scim_provisioning_events_tenantId_createdAt_idx"
  ON "scim_provisioning_events"("tenantId", "createdAt");

CREATE INDEX "scim_provisioning_events_tenantId_status_createdAt_idx"
  ON "scim_provisioning_events"("tenantId", "status", "createdAt");

CREATE INDEX "scim_provisioning_events_tenantId_operation_createdAt_idx"
  ON "scim_provisioning_events"("tenantId", "operation", "createdAt");

ALTER TABLE "scim_provisioning_events"
  ADD CONSTRAINT "scim_provisioning_events_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
