CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"actor" varchar(50) NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"pin_hash" varchar(255),
	"avatar_url" varchar(500),
	"balance" integer DEFAULT 0 NOT NULL,
	"birth_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"content" text NOT NULL,
	"parent_signed_at" timestamp with time zone,
	"child_signed_at" timestamp with time zone,
	"child_signature_data" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"child_id" uuid,
	"push_token" varchar(500) NOT NULL,
	"platform" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_push_token_unique" UNIQUE("push_token")
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255),
	"master_password_hash" varchar(255),
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"locale" varchar(10) DEFAULT 'pt-BR' NOT NULL,
	"timezone" varchar(50) DEFAULT 'America/Sao_Paulo' NOT NULL,
	"google_email" varchar(255),
	"google_name" varchar(255),
	"google_photo" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "families_email_unique" UNIQUE("email"),
	CONSTRAINT "families_google_email_unique" UNIQUE("google_email")
);
--> statement-breakpoint
CREATE TABLE "family_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"invite_code" varchar(12) NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"accepted_by_guardian_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "family_invitations_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"email" varchar(255),
	"password_hash" varchar(255),
	"name" varchar(100) NOT NULL,
	"role_label" varchar(50) NOT NULL,
	"avatar_url" varchar(500),
	"google_email" varchar(255),
	"google_name" varchar(255),
	"google_photo" varchar(500),
	"invited_by" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardians_email_unique" UNIQUE("email"),
	CONSTRAINT "guardians_google_email_unique" UNIQUE("google_email")
);
--> statement-breakpoint
CREATE TABLE "scheduled_deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"frequency" varchar(10) NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_run_at" timestamp with time zone,
	"status" varchar(15) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"category" varchar(30) NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"scheduled_deposit_id" uuid,
	"created_by" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_invitations" ADD CONSTRAINT "family_invitations_accepted_by_guardian_id_guardians_id_fk" FOREIGN KEY ("accepted_by_guardian_id") REFERENCES "public"."guardians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_deposits" ADD CONSTRAINT "scheduled_deposits_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_deposits" ADD CONSTRAINT "scheduled_deposits_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_scheduled_deposit_id_scheduled_deposits_id_fk" FOREIGN KEY ("scheduled_deposit_id") REFERENCES "public"."scheduled_deposits"("id") ON DELETE no action ON UPDATE no action;