-- Add first access password change controls
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);
