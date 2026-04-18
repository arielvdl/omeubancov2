ALTER TABLE "family_invitations" ADD COLUMN IF NOT EXISTS "access_level" varchar(20) NOT NULL DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "guardians" ADD COLUMN IF NOT EXISTS "access_level" varchar(20) NOT NULL DEFAULT 'member';--> statement-breakpoint
