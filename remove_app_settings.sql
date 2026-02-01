-- ============================================
-- REMOVE APP SETTINGS TABLE AND FUNCTIONS
-- ============================================
-- Run this to clean up the old API key system
-- ============================================

-- Drop the table and all related objects
DROP TABLE IF EXISTS public.app_settings CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_api_key(TEXT);
DROP FUNCTION IF EXISTS public.get_api_key();

-- Clean up done!
-- Now use Supabase Secrets instead (see instructions below)
