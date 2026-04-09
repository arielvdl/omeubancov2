ALTER TABLE "families" ADD COLUMN "apple_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_apple_user_id_unique" UNIQUE("apple_user_id");
