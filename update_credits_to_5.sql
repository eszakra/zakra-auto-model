-- ============================================
-- REED UPDATE: Change Free Credits from 30 to 5
-- ============================================
-- Run this in Supabase SQL Editor after the main setup
-- ============================================

-- 1. Update the trigger function for new users (5 credits instead of 30)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, plan_type, credits)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'free', 5);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update existing free users to have 5 credits (optional - only if you want to reset existing users)
-- UPDATE public.user_profiles 
-- SET credits = 5 
-- WHERE plan_type = 'free' AND credits = 30;

-- 3. Update feature flag for free credits on register
UPDATE public.feature_flags 
SET value = '5'::jsonb 
WHERE key = 'free_credits_on_register';

-- 4. Update plans table - Free plan now gives 5 credits
UPDATE public.plans 
SET credits_per_month = 5,
    features = '["5 free generations", "Normal queue", "Standard resolution", "Basic support"]'::jsonb
WHERE id = 'free';

-- ============================================
-- DONE! All new users will now get 5 free credits
-- ============================================
