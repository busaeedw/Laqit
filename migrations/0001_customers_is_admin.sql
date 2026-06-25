ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false NOT NULL;
