-- NutriFlow Migration 0001: Add user_swiggy_tokens and app_settings tables with RLS and UUID foreign key

-- 1. App Settings Table (Dynamic Client Registration persistence, backend-only)
CREATE TABLE IF NOT EXISTS "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS: No policies granted to anon or authenticated roles ensures strict backend-only access
ALTER TABLE "app_settings" ENABLE ROW LEVEL SECURITY;

-- 2. User Swiggy Tokens Table (UUID foreign key, backend-only token storage)
CREATE TABLE IF NOT EXISTS "user_swiggy_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL UNIQUE REFERENCES "user_profiles"("id") ON DELETE CASCADE,
	"access_token" text NOT NULL,
	"token_type" text DEFAULT 'Bearer' NOT NULL,
	"scope" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS: Tokens are managed strictly server-side; blocking PostgREST prevents client exposure
ALTER TABLE "user_swiggy_tokens" ENABLE ROW LEVEL SECURITY;

-- Index on user_id for fast token lookups
CREATE INDEX IF NOT EXISTS "idx_user_swiggy_tokens_user_id" ON "user_swiggy_tokens"("user_id");
