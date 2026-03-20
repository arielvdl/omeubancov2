CREATE TABLE IF NOT EXISTS "wish_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"photo_url" varchar(500) NOT NULL,
	"name" varchar(200),
	"price_cents" integer,
	"desire_level" integer DEFAULT 2 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"is_goal" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"conquered_at" timestamp with time zone,
	"note" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wish_items" ADD CONSTRAINT "wish_items_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_wish_items_child" ON "wish_items" USING btree ("child_id");
--> statement-breakpoint
CREATE INDEX "idx_wish_items_status" ON "wish_items" USING btree ("child_id","status");
--> statement-breakpoint
CREATE INDEX "idx_wish_items_goal" ON "wish_items" USING btree ("child_id","is_goal") WHERE "wish_items"."is_goal" = true;
