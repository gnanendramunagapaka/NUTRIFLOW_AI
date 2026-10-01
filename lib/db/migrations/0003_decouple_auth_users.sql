-- Migration: 0003_decouple_auth_users.sql
-- Decouple NutriFlow profiles from Supabase Auth users

ALTER TABLE "user_profiles"
DROP CONSTRAINT IF EXISTS "user_profiles_id_fkey";

ALTER TABLE "user_profiles"
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
