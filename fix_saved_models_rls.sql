-- ============================================
-- FIX saved_models - DELETE + orphan models
-- Run this in Supabase SQL Editor
-- ============================================


-- ============================================
-- 1. Fix orphan models (user_id is NULL)
-- These were created before user_id was required.
-- Assign them to the user who likely created them
-- by matching the session or just list them first.
-- ============================================

-- First, see which models have no user_id:
-- SELECT id, model_name, user_id, created_at FROM saved_models WHERE user_id IS NULL;

-- If you want to assign all orphan models to your admin user, uncomment and run:
-- UPDATE saved_models SET user_id = 'd5634917-6130-4f15-987e-17d878af8507' WHERE user_id IS NULL;


-- ============================================
-- 2. Make user_id NOT NULL going forward
-- (after fixing orphans above)
-- ============================================
-- Only run this AFTER fixing all NULL user_ids:
-- ALTER TABLE saved_models ALTER COLUMN user_id SET NOT NULL;


-- ============================================
-- 3. RLS Policies for saved_models
-- ============================================

-- Ensure RLS is enabled
ALTER TABLE public.saved_models ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start clean
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'saved_models' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.saved_models', pol.policyname);
  END LOOP;
END $$;

-- Users can SELECT their own models
CREATE POLICY "Users can view own models"
  ON public.saved_models FOR SELECT
  USING (auth.uid() = user_id);

-- Users can INSERT their own models
CREATE POLICY "Users can insert own models"
  ON public.saved_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE their own models (rename, fix user_id)
CREATE POLICY "Users can update own models"
  ON public.saved_models FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Users can DELETE their own models
CREATE POLICY "Users can delete own models"
  ON public.saved_models FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins full access"
  ON public.saved_models FOR ALL
  USING (
    COALESCE(
      (auth.jwt()->'app_metadata'->>'is_admin')::boolean,
      false
    ) = true
  );

-- Ensure correct grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_models TO authenticated;


-- ============================================
-- DONE
-- ============================================
