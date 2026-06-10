-- Multi-family: a mesma pessoa (email/google_email) pode ser guardian em
-- várias famílias. Unicidade passa a ser por família, não global.
ALTER TABLE "guardians" DROP CONSTRAINT IF EXISTS "guardians_email_unique";--> statement-breakpoint
ALTER TABLE "guardians" DROP CONSTRAINT IF EXISTS "guardians_google_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "guardians_family_email_unique" ON "guardians" ("family_id", "email") WHERE "email" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "guardians_family_google_email_unique" ON "guardians" ("family_id", "google_email") WHERE "google_email" IS NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardians_email_idx" ON "guardians" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guardians_google_email_idx" ON "guardians" ("google_email");
