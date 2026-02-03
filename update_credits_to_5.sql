-- ============================================
-- REED: High Margin Pricing Structure
-- ============================================
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Update the trigger function for new users (3 credits)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, plan_type, credits)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'free', 3);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update default credits column
ALTER TABLE public.user_profiles ALTER COLUMN credits SET DEFAULT 3;

-- 3. Update or insert plans with new pricing
DELETE FROM public.plans WHERE name IN ('Free', 'Basic', 'Starter', 'Creator', 'Pro', 'Premium', 'Studio');

INSERT INTO public.plans (name, price_monthly, credits_per_month, features, is_active) VALUES
  ('Free', 0.00, 3, '{"nsfw": false, "queue": "normal", "resolution": "standard", "support": "community"}', true),
  ('Starter', 29.00, 50, '{"nsfw": "soon", "queue": "priority", "resolution": "hd", "support": "email"}', true),
  ('Creator', 59.00, 120, '{"nsfw": true, "queue": "priority", "resolution": "4k", "support": "fast"}', true),
  ('Pro', 99.00, 250, '{"nsfw": true, "queue": "priority", "resolution": "4k", "support": "priority"}', true),
  ('Studio', 199.00, 600, '{"nsfw": "full", "queue": "vip", "resolution": "4k", "support": "1on1", "api_access": true}', true);

-- 4. Update feature flag
UPDATE public.feature_flags
SET value = '3'::jsonb
WHERE key = 'free_credits_on_register';

-- ============================================
-- PRICING STRUCTURE:
-- Free:    $0    / 3 credits   (trial)
-- Starter: $29   / 50 credits  (83% margin)
-- Creator: $59   / 120 credits (80% margin)
-- Pro:     $99   / 250 credits (75% margin)
-- Studio:  $199  / 600 credits (70% margin)
-- ============================================
