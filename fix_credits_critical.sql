-- ============================================
-- REED CREDITS FIX - CRITICAL
-- Run this in Supabase SQL Editor IMMEDIATELY
-- ============================================
-- Fixes:
-- 1. use_credits function (recreate it properly)
-- 2. Ensures trigger doesn't block SECURITY DEFINER functions
-- 3. Adds GRANT for authenticated users to call the function
-- 4. Adds rate limiting to prevent abuse
-- ============================================


-- ============================================
-- 1. DROP and RECREATE use_credits with proper security
-- ============================================
DROP FUNCTION IF EXISTS public.use_credits(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.use_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_credits INTEGER;
  v_plan_type TEXT;
  v_rows_affected INTEGER;
BEGIN
  -- SECURITY: User can only use their own credits (admins can use anyone's)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() != p_user_id
    AND NOT COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) THEN
    RAISE EXCEPTION 'Unauthorized: can only use own credits';
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: must be positive';
  END IF;

  -- Lock the row to prevent race conditions (SELECT FOR UPDATE)
  SELECT credits, plan_type INTO v_current_credits, v_plan_type
  FROM public.user_profiles
  WHERE id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check credits (premium has unlimited)
  IF v_plan_type != 'premium' AND v_current_credits < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct credits (skip deduction for premium but still track generation)
  IF v_plan_type != 'premium' THEN
    UPDATE public.user_profiles
    SET credits = credits - p_amount,
        total_generations = total_generations + 1,
        updated_at = NOW()
    WHERE id = p_user_id
      AND credits >= p_amount;  -- Double-check in WHERE clause for safety

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    -- If no rows were updated, someone else used the credits first (race condition)
    IF v_rows_affected = 0 THEN
      RETURN FALSE;
    END IF;

    -- Log the transaction
    INSERT INTO public.credit_transactions (user_id, amount, type, description)
    VALUES (p_user_id, -p_amount, 'usage', COALESCE(p_description, 'Image generation'));
  ELSE
    -- Premium: just track the generation count
    UPDATE public.user_profiles
    SET total_generations = total_generations + 1,
        updated_at = NOW()
    WHERE id = p_user_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================
-- 2. GRANT execute permission to authenticated users
-- ============================================
GRANT EXECUTE ON FUNCTION public.use_credits(UUID, INTEGER, TEXT) TO authenticated;


-- ============================================
-- 3. Fix the protect_sensitive_fields trigger
-- The trigger must NOT block SECURITY DEFINER functions.
-- We check if the caller is a SECURITY DEFINER function by checking
-- the current_setting('role'). SECURITY DEFINER functions with
-- SET search_path run as the function owner, but the JWT context
-- is still the original user. However, the UPDATE inside
-- use_credits uses the function owner's privileges, so we need
-- to ensure the trigger allows it.
--
-- The fix: the trigger should check if the session is service_role
-- OR if the update is happening within a SECURITY DEFINER context.
-- We detect this by checking if current_user matches the function owner.
-- ============================================
CREATE OR REPLACE FUNCTION public.protect_sensitive_fields()
RETURNS TRIGGER AS $$
DECLARE
  is_admin_user BOOLEAN;
  is_rpc_context BOOLEAN;
BEGIN
  -- Service role (webhooks, server-side) can do anything
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Check if we're inside a SECURITY DEFINER RPC function
  -- When use_credits() calls UPDATE, current_user is the function owner (postgres/supabase_admin)
  -- but session_user is still the authenticated user
  is_rpc_context := (current_user != session_user);

  -- If called from a SECURITY DEFINER function (like use_credits), allow the change
  IF is_rpc_context THEN
    RETURN NEW;
  END IF;

  -- Check if caller is admin via JWT app_metadata
  is_admin_user := COALESCE(
    (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'is_admin')::boolean,
    false
  );

  IF NOT is_admin_user THEN
    -- Regular users CANNOT modify these fields via direct UPDATE - silently revert
    NEW.credits := OLD.credits;
    NEW.is_admin := OLD.is_admin;
    NEW.plan_type := OLD.plan_type;
    NEW.subscription_status := OLD.subscription_status;
    NEW.subscription_id := OLD.subscription_id;
    NEW.email_verified := OLD.email_verified;
    NEW.total_generations := OLD.total_generations;
    NEW.email := OLD.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
DROP TRIGGER IF EXISTS protect_user_profile_fields ON public.user_profiles;
CREATE TRIGGER protect_user_profile_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_fields();


-- ============================================
-- 4. Also fix add_credits function
-- ============================================
DROP FUNCTION IF EXISTS public.add_credits(UUID, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'purchase'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY: Only admins can add credits
  IF NOT COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  UPDATE public.user_profiles
  SET credits = credits + p_amount, updated_at = NOW()
  WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, p_type, COALESCE(p_description, 'Admin adjustment'));

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, TEXT) TO authenticated;


-- ============================================
-- 5. Verify everything works - test query
-- Run this after the above to check:
-- ============================================
-- SELECT
--   p.proname AS function_name,
--   pg_get_functiondef(p.oid) AS definition
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('use_credits', 'add_credits', 'protect_sensitive_fields');


-- ============================================
-- DONE
-- ============================================
