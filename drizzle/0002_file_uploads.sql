ALTER TABLE "files" ADD COLUMN "status" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "upload_token_hash" text;