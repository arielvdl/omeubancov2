-- ============================================================
-- Migration 0009: Google profile photo URLs need unbounded text
-- Root cause: OAuth callback was failing with Postgres 22001
-- (value too long for type character varying(500)) when Google
-- returned long profile photo URLs (e.g. signed lh3 URLs).
-- ============================================================

ALTER TABLE "families"
  ALTER COLUMN "google_photo" TYPE text;
--> statement-breakpoint

ALTER TABLE "guardians"
  ALTER COLUMN "google_photo" TYPE text;
--> statement-breakpoint

-- Also relax guardians.avatar_url and children.avatar_url, which
-- can hold long signed Cloud Storage URLs after upload.
ALTER TABLE "guardians"
  ALTER COLUMN "avatar_url" TYPE text;
--> statement-breakpoint

ALTER TABLE "children"
  ALTER COLUMN "avatar_url" TYPE text;
--> statement-breakpoint
