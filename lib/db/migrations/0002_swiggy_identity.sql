-- Migration: 0002_swiggy_identity.sql
-- Add external Swiggy user ID column with unique constraint and make email nullable

ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "swiggy_user_id" text UNIQUE;
ALTER TABLE "user_profiles" ALTER COLUMN "email" DROP NOT NULL;
