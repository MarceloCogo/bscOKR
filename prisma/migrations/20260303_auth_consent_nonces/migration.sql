CREATE TABLE "auth_consent_nonces" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nonceHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "auth_consent_nonces_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_consent_nonces_tenantId_userId_idx" ON "auth_consent_nonces"("tenantId", "userId");
CREATE INDEX "auth_consent_nonces_nonceHash_idx" ON "auth_consent_nonces"("nonceHash");
CREATE INDEX "auth_consent_nonces_expiresAt_idx" ON "auth_consent_nonces"("expiresAt");

ALTER TABLE "auth_consent_nonces"
ADD CONSTRAINT "auth_consent_nonces_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "auth_consent_nonces"
ADD CONSTRAINT "auth_consent_nonces_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
