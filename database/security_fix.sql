-- ============================================
-- REED SECURITY FIX - CRITICAL
-- Run this in Supabase SQL Editor
-- ============================================
-- Fixes: credit manipulation, fake purchases,
-- status tampering, admin bypass, exposed data,
-- Security Definer warnings, function search paths
-- ============================================


-- ============================================
-- 1. PROTECT user_profiles SENSITIVE FIELDS
-- Prevents users from modifying credits, is_admin, plan_type etc.
-- ============================================

CREATE OR REPLACE FUNCTION public.protect_sensitive_fields()
RETURNS TRIGGER AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  -- Service role (webhooks, server-side) can do anything
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Check if caller is admin via JWT app_metadata
  is_admin_user := coalesce(
    (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'is_admin')::boolean,
    false
  );

  IF NOT is_admin_user THEN
    -- Regular users CANNOT modify these fields - silently revert
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

DROP TRIGGER IF EXISTS protect_user_profile_fields ON public.user_profiles;
CREATE TRIGGER protect_user_profile_fields
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_fields();


-- ============================================
-- 2. PROTECT service_purchases
-- Prevents fake purchases, status manipulation, download_url tampering
-- ============================================

CREATE OR REPLACE FUNCTION public.protect_purchase_fields()
RETURNS TRIGGER AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  is_admin_user := coalesce(
    (current_setting('request.jwt.claims', true)::json->'app_metadata'->>'is_admin')::boolean,
    false
  );

  IF NOT is_admin_user THEN
    -- Regular users can ONLY update photos_uploaded and metadata
    NEW.status := OLD.status;
    NEW.download_url := OLD.download_url;
    NEW.amount := OLD.amount;
    NEW.currency := OLD.currency;
    NEW.service_id := OLD.service_id;
    NEW.service_name := OLD.service_name;
    NEW.service_category := OLD.service_category;
    NEW.coinbase_charge_code := OLD.coinbase_charge_code;
    NEW.user_id := OLD.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_purchase_fields ON service_purchases;
CREATE TRIGGER protect_purchase_fields
  BEFORE UPDATE ON service_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_purchase_fields();

-- Fix RLS policies for service_purchases
DROP POLICY IF EXISTS "Users can view own service purchases" ON service_purchases;
DROP POLICY IF EXISTS "Users can update own service purchases" ON service_purchases;
DROP POLICY IF EXISTS "Service role can insert service purchases" ON service_purchases;
DROP POLICY IF EXISTS "Admins can view all service purchases" ON service_purchases;
DROP POLICY IF EXISTS "Admins can update all service purchases" ON service_purchases;
DROP POLICY IF EXISTS "Admins can delete service purchases" ON service_purchases;
DROP POLICY IF EXISTS "Only service role can insert purchases" ON service_purchases;

-- Users can only SELECT their own purchases
CREATE POLICY "Users can view own service purchases"
  ON service_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all purchases
CREATE POLICY "Admins can view all service purchases"
  ON service_purchases FOR SELECT
  USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

-- Users can update own purchases (trigger limits which fields)
CREATE POLICY "Users can update own service purchases"
  ON service_purchases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can update any purchase
CREATE POLICY "Admins can update all service purchases"
  ON service_purchases FOR UPDATE
  USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

-- BLOCK all client-side INSERT (only service_role/webhook can insert, it bypasses RLS)
CREATE POLICY "Only service role can insert purchases"
  ON service_purchases FOR INSERT
  WITH CHECK (false);

-- Only admins can delete
CREATE POLICY "Admins can delete service purchases"
  ON service_purchases FOR DELETE
  USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

-- Fix grants
REVOKE INSERT, DELETE ON service_purchases FROM authenticated;
GRANT SELECT, UPDATE ON service_purchases TO authenticated;


-- ============================================
-- 3. FIX add_credits - Require admin
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
  VALUES (p_user_id, p_amount, p_type, p_description);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================
-- 4. FIX update_user_plan - Require admin
-- ============================================

CREATE OR REPLACE FUNCTION public.update_user_plan(
  p_user_id UUID,
  p_plan_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  UPDATE public.user_profiles
  SET plan_type = p_plan_type, updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================
-- 5. FIX use_credits - Verify caller is the user
-- ============================================

CREATE OR REPLACE FUNCTION public.use_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_credits INTEGER;
  v_plan_type TEXT;
BEGIN
  -- SECURITY: User can only use their own credits
  IF auth.uid() != p_user_id
    AND NOT COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) THEN
    RAISE EXCEPTION 'Unauthorized: can only use own credits';
  END IF;

  SELECT credits, plan_type INTO v_current_credits, v_plan_type
  FROM public.user_profiles WHERE id = p_user_id;

  IF v_plan_type = 'premium' OR v_current_credits >= p_amount THEN
    IF v_plan_type != 'premium' THEN
      UPDATE public.user_profiles
      SET credits = credits - p_amount,
          total_generations = total_generations + 1,
          updated_at = NOW()
      WHERE id = p_user_id;

      INSERT INTO public.credit_transactions (user_id, amount, type, description)
      VALUES (p_user_id, -p_amount, 'usage', p_description);
    ELSE
      UPDATE public.user_profiles
      SET total_generations = total_generations + 1, updated_at = NOW()
      WHERE id = p_user_id;
    END IF;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================
-- 6. FIX handle_new_user - Set search_path
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, plan_type, credits)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'free', 5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================
-- 7. FIX feature flag functions - Set search_path + admin checks
-- ============================================

CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value FROM public.feature_flags WHERE key = p_key;
  IF v_value IS NULL THEN RETURN FALSE; END IF;
  RETURN (v_value::text = 'true');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_user_feature(
  p_user_id UUID,
  p_feature_key TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_global_enabled BOOLEAN;
  v_user_override JSONB;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_global_enabled := public.is_feature_enabled(p_feature_key);

  SELECT value, expires_at INTO v_user_override, v_expires_at
  FROM public.user_features
  WHERE user_id = p_user_id AND feature_key = p_feature_key
  AND (expires_at IS NULL OR expires_at > NOW());

  IF v_user_override IS NOT NULL THEN
    RETURN (v_user_override::text = 'true');
  END IF;

  RETURN v_global_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_feature_value(
  p_key TEXT,
  p_default JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value FROM public.feature_flags WHERE key = p_key;
  RETURN COALESCE(v_value, p_default);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.grant_user_feature(
  p_user_id UUID,
  p_feature_key TEXT,
  p_value JSONB DEFAULT 'true'::jsonb,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  INSERT INTO public.user_features (user_id, feature_key, value, expires_at, granted_by)
  VALUES (p_user_id, p_feature_key, p_value, p_expires_at, auth.uid())
  ON CONFLICT (user_id, feature_key)
  DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at, granted_by = EXCLUDED.granted_by;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.revoke_user_feature(
  p_user_id UUID,
  p_feature_key TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  DELETE FROM public.user_features
  WHERE user_id = p_user_id AND feature_key = p_feature_key;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_feature_flag(
  p_key TEXT,
  p_value JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  UPDATE public.feature_flags
  SET value = p_value, updated_at = NOW(), updated_by = auth.uid()
  WHERE key = p_key;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.create_feature_flag(
  p_key TEXT,
  p_value JSONB,
  p_description TEXT DEFAULT NULL,
  p_category TEXT DEFAULT 'general'
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  INSERT INTO public.feature_flags (key, value, description, category, updated_by)
  VALUES (p_key, p_value, p_description, p_category, auth.uid())
  ON CONFLICT (key) DO NOTHING;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================
-- 8. FIX Security Definer Views
-- (Resolves Supabase Dashboard CRITICAL warnings)
-- ============================================

-- Fix active_user_features view
DROP VIEW IF EXISTS public.active_user_features;
CREATE VIEW public.active_user_features AS
  SELECT uf.user_id, uf.feature_key, uf.value, uf.expires_at
  FROM public.user_features uf
  WHERE uf.expires_at IS NULL OR uf.expires_at > NOW();
ALTER VIEW public.active_user_features SET (security_invoker = on);

-- Fix feature_flags_summary view
DROP VIEW IF EXISTS public.feature_flags_summary;
CREATE VIEW public.feature_flags_summary AS
  SELECT ff.key, ff.value, ff.description, ff.category, ff.updated_at
  FROM public.feature_flags ff;
ALTER VIEW public.feature_flags_summary SET (security_invoker = on);


-- ============================================
-- 9. SET admin app_metadata on your user
-- This is REQUIRED for the admin checks above to work
-- ============================================

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"is_admin": true}'::jsonb
WHERE id = 'd5634917-6130-4f15-987e-17d878af8507';


-- ============================================
-- DONE - All security vulnerabilities patched
-- ============================================
