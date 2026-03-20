CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"revenuecat_customer_id" varchar(255),
	"entitlement" varchar(50) DEFAULT 'free' NOT NULL,
	"product_id" varchar(100),
	"store" varchar(20),
	"is_active" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone,
	"original_purchase_date" timestamp with time zone,
	"unsubscribe_detected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_family_id_unique" UNIQUE("family_id")
);
--> statement-breakpoint
CREATE TABLE "wish_items" (
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
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_items" ADD CONSTRAINT "wish_items_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;