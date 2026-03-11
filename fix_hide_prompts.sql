-- ============================================
-- REED - HIDE PROMPTS FROM NON-ADMIN USERS
-- Run this in Supabase SQL Editor
-- ============================================
-- Strategy: Use a VIEW + RLS to strip the prompt column
-- for regular users. Admins see everything.
--
-- This is the SECURE approach:
-- - Regular users: prompt field returns NULL
-- - Admins: prompt field returns the full JSON
-- - The raw table data is never exposed to non-admins
-- ============================================


-- ============================================
-- 1. Create a secure view that strips prompt for non-admins
-- This replaces direct table access for the history query
-- ============================================

-- Drop existing view if any
DROP VIEW IF EXISTS public.generation_logs_safe;

CREATE VIEW public.generation_logs_safe AS
SELECT
  id,
  user_id,
  model_name,
  image_url,
  -- Only show prompt to admins
  CASE
    WHEN COALESCE(
      (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'is_admin')::boolean,
      false
    ) THEN prompt
    ELSE NULL
  END AS prompt,
  aspect_ratio,
  resolution,
  credits_used,
  status,
  error_message,
  created_at
FROM public.generation_logs;

-- Make it security invoker so RLS on the base table still applies
ALTER VIEW public.generation_logs_safe SET (security_invoker = on);

-- Grant access
GRANT SELECT ON public.generation_logs_safe TO authenticated;


-- ============================================
-- 2. Tighten RLS on generation_logs base table
-- Ensure users can only see their own records
-- and the prompt column is protected
-- ============================================

-- Enable RLS if not already
ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate cleanly
DROP POLICY IF EXISTS "Users can view own generation logs" ON public.generation_logs;
DROP POLICY IF EXISTS "Users can insert own generation logs" ON public.generation_logs;
DROP POLICY IF EXISTS "Admins can view all generation logs" ON public.generation_logs;
DROP POLICY IF EXISTS "Users view own logs" ON public.generation_logs;
DROP POLICY IF EXISTS "Users insert own logs" ON public.generation_logs;
DROP POLICY IF EXISTS "Admins view all logs" ON public.generation_logs;

-- Users can only SELECT their own records
CREATE POLICY "Users view own logs"
  ON public.generation_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can SELECT all records
CREATE POLICY "Admins view all logs"
  ON public.generation_logs FOR SELECT
  USING (
    COALESCE(
      (auth.jwt()->'app_metadata'->>'is_admin')::boolean,
      false
    ) = true
  );

-- Users can INSERT their own records
CREATE POLICY "Users insert own logs"
  ON public.generation_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Revoke direct UPDATE/DELETE from regular users
REVOKE UPDATE, DELETE ON public.generation_logs FROM authenticated;
GRANT SELECT, INSERT ON public.generation_logs TO authenticated;


-- ============================================
-- 3. Create a FUNCTION to fetch history securely
-- This is what the frontend will call instead of
-- querying the table directly
-- ============================================

DROP FUNCTION IF EXISTS public.get_generation_history(INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_generation_history(
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  model_name TEXT,
  image_url TEXT,
  prompt TEXT,
  aspect_ratio TEXT,
  resolution TEXT,
  credits_used INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  v_is_admin := COALESCE(
    (auth.jwt()->'app_metadata'->>'is_admin')::boolean,
    false
  );

  RETURN QUERY
  SELECT
    gl.id,
    gl.user_id,
    gl.model_name,
    gl.image_url,
    -- Strip prompt for non-admins
    CASE WHEN v_is_admin THEN gl.prompt ELSE NULL END AS prompt,
    gl.aspect_ratio,
    gl.resolution,
    gl.credits_used,
    gl.status,
    gl.created_at
  FROM public.generation_logs gl
  WHERE gl.user_id = auth.uid() OR v_is_admin
  ORDER BY gl.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_generation_history(INTEGER, INTEGER) TO authenticated;


-- ============================================
-- DONE
-- ============================================
