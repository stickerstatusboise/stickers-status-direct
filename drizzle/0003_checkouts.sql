CREATE TABLE "checkouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_session_id" text,
	"email" text NOT NULL,
	"payload" jsonb NOT NULL,
	"total_cents" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "checkouts_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
--> statement-breakpoint
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Browsers never read checkouts directly (see 0001_rules.sql)
ALTER TABLE "checkouts" ENABLE ROW LEVEL SECURITY;
