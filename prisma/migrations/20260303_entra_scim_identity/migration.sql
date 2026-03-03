ALTER TABLE "users"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "identityProvider" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN "externalId" TEXT,
ADD COLUMN "entraObjectId" TEXT;

CREATE TABLE "tenant_identity_providers" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "entraTenantId" TEXT,
  "entraClientId" TEXT,
  "entraClientSecret" TEXT,
  "scimTokenHash" TEXT,
  "scimTokenCreatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tenant_identity_providers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_tenantId_externalId_key" ON "users"("tenantId", "externalId");
CREATE UNIQUE INDEX "users_tenantId_entraObjectId_key" ON "users"("tenantId", "entraObjectId");

CREATE UNIQUE INDEX "tenant_identity_providers_tenantId_provider_key" ON "tenant_identity_providers"("tenantId", "provider");
CREATE INDEX "tenant_identity_providers_provider_enabled_idx" ON "tenant_identity_providers"("provider", "enabled");
CREATE INDEX "tenant_identity_providers_scimTokenHash_idx" ON "tenant_identity_providers"("scimTokenHash");

ALTER TABLE "tenant_identity_providers"
ADD CONSTRAINT "tenant_identity_providers_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
