-- =====================================================
-- PLAN MIGRATION SCRIPT FOR SUPABASE
-- =====================================================
-- This script updates the plan system from old plans (free, basic, pro, premium)
-- to new plans (free, starter, creator, pro, studio)
-- =====================================================

-- Step 1: Drop the existing constraint on plan_type
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_plan_type_check;

-- Step 2: Add new constraint with updated plan types
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_plan_type_check
CHECK (plan_type = ANY (ARRAY['free'::text, 'starter'::text, 'creator'::text, 'pro'::text, 'studio'::text]));

-- Step 3: Migrate existing users from old plans to new plans
-- premium -> creator (as it's the closest match with NSFW access)
-- basic -> starter
UPDATE public.user_profiles
SET plan_type = 'creator'
WHERE plan_type = 'premium';

UPDATE public.user_profiles
SET plan_type = 'starter'
WHERE plan_type = 'basic';

-- Step 4: Update or insert plans in the plans table
-- First, delete old plans that no longer exist
DELETE FROM public.plans WHERE id IN ('basic', 'premium');

-- Insert/Update the new plans
INSERT INTO public.plans (id, name, price_monthly, credits_per_month, features, is_active)
VALUES
  ('free', 'Free', 0, 3, '{"nsfw": false, "queue": "normal", "resolution": "standard", "support": "community"}', true),
  ('starter', 'Starter', 29, 50, '{"nsfw": "soon", "queue": "priority", "resolution": "HD", "support": "email"}', true),
  ('creator', 'Creator', 59, 120, '{"nsfw": true, "queue": "priority", "resolution": "4K", "support": "fast", "beta_access": true}', true),
  ('pro', 'Pro', 99, 250, '{"nsfw": true, "queue": "high_priority", "resolution": "4K", "support": "priority", "custom_presets": true, "early_access": true}', true),
  ('studio', 'Studio', 199, 600, '{"nsfw": "full", "queue": "vip", "resolution": "4K+", "support": "1:1", "api_access": true, "white_label": true}', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  credits_per_month = EXCLUDED.credits_per_month,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active;

-- Step 5: Create or replace the update_user_plan function
CREATE OR REPLACE FUNCTION public.update_user_plan(
  p_user_id UUID,
  p_plan_type TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Validate plan type
  IF p_plan_type NOT IN ('free', 'starter', 'creator', 'pro', 'studio') THEN
    RAISE EXCEPTION 'Invalid plan type: %', p_plan_type;
  END IF;

  -- Update user plan
  UPDATE public.user_profiles
  SET
    plan_type = p_plan_type,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the action
  INSERT INTO public.admin_actions (admin_id, action_type, target_user_id, details)
  VALUES (
    auth.uid(),
    'plan_change',
    p_user_id,
    jsonb_build_object('new_plan', p_plan_type)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create or replace the add_credits function (supporting negative amounts for removal)
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT 'Credit adjustment',
  p_type TEXT DEFAULT 'admin_adjustment'
)
RETURNS VOID AS $$
DECLARE
  v_current_credits INTEGER;
BEGIN
  -- Get current credits
  SELECT credits INTO v_current_credits
  FROM public.user_profiles
  WHERE id = p_user_id;

  -- Prevent negative balance
  IF v_current_credits + p_amount < 0 THEN
    RAISE EXCEPTION 'Cannot remove more credits than available. Current: %, Requested: %', v_current_credits, p_amount;
  END IF;

  -- Update user credits
  UPDATE public.user_profiles
  SET
    credits = credits + p_amount,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Log the transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, p_type, p_description);

  -- Log admin action if it's an admin adjustment
  IF p_type = 'admin_adjustment' THEN
    INSERT INTO public.admin_actions (admin_id, action_type, target_user_id, details)
    VALUES (
      auth.uid(),
      'credit_adjustment',
      p_user_id,
      jsonb_build_object('amount', p_amount, 'description', p_description)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user_plan(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits(UUID, INTEGER, TEXT, TEXT) TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES (run these to verify the migration)
-- =====================================================

-- Check plan distribution after migration
-- SELECT plan_type, COUNT(*) as user_count FROM public.user_profiles GROUP BY plan_type;

-- Check plans table
-- SELECT * FROM public.plans ORDER BY price_monthly;

-- Check constraint
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'user_profiles_plan_type_check';
