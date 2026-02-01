-- ============================================
-- REED COMPLETE DATABASE SETUP - FIXED VERSION
-- ============================================
-- Run this entire file in Supabase SQL Editor
-- This creates all tables, functions, triggers, and policies
-- ============================================

-- ============================================
-- 1. USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'basic', 'pro', 'premium')),
    credits INTEGER DEFAULT 30,
    total_generations INTEGER DEFAULT 0,
    is_admin BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    trial_ends_at TIMESTAMPTZ,
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'past_due')),
    subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;

-- Create policies - FIXED: Use auth.jwt() to avoid recursion
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- For admin policies, we use a different approach to avoid recursion
CREATE POLICY "Admins can view all profiles"
    ON public.user_profiles FOR SELECT
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

CREATE POLICY "Admins can update all profiles"
    ON public.user_profiles FOR UPDATE
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

-- ============================================
-- 2. CREDIT TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'bonus', 'refund', 'admin_adjustment')),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.credit_transactions;
DROP POLICY IF EXISTS "Admins can insert transactions" ON public.credit_transactions;

CREATE POLICY "Users can view own transactions"
    ON public.credit_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- Admin policies using JWT to avoid recursion
CREATE POLICY "Admins can view all transactions"
    ON public.credit_transactions FOR SELECT
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

CREATE POLICY "Admins can insert transactions"
    ON public.credit_transactions FOR INSERT
    WITH CHECK (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

-- ============================================
-- 3. GENERATION LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    prompt TEXT,
    aspect_ratio TEXT,
    resolution TEXT,
    credits_used INTEGER DEFAULT 1,
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.generation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own generations" ON public.generation_logs;
DROP POLICY IF EXISTS "Users can insert own generations" ON public.generation_logs;
DROP POLICY IF EXISTS "Admins can view all generations" ON public.generation_logs;

CREATE POLICY "Users can view own generations"
    ON public.generation_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
    ON public.generation_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all generations"
    ON public.generation_logs FOR SELECT
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

-- ============================================
-- 4. ADMIN ACTIONS LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    target_user_id UUID REFERENCES auth.users(id),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view admin actions" ON public.admin_actions;

CREATE POLICY "Only admins can view admin actions"
    ON public.admin_actions FOR SELECT
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

-- ============================================
-- 5. TRIGGER FUNCTION FOR NEW USER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, plan_type, credits)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'free', 5);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. FUNCTION TO USE CREDITS
-- ============================================
CREATE OR REPLACE FUNCTION public.use_credits(p_user_id UUID, p_amount INTEGER, p_description TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_credits INTEGER;
    v_plan_type TEXT;
BEGIN
    SELECT credits, plan_type INTO v_current_credits, v_plan_type FROM public.user_profiles WHERE id = p_user_id;
    
    IF v_plan_type = 'premium' OR v_current_credits >= p_amount THEN
        IF v_plan_type != 'premium' THEN
            UPDATE public.user_profiles SET credits = credits - p_amount, total_generations = total_generations + 1, updated_at = NOW() WHERE id = p_user_id;
            INSERT INTO public.credit_transactions (user_id, amount, type, description) VALUES (p_user_id, -p_amount, 'usage', p_description);
        ELSE
            UPDATE public.user_profiles SET total_generations = total_generations + 1, updated_at = NOW() WHERE id = p_user_id;
        END IF;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. FUNCTION TO ADD CREDITS
-- ============================================
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id UUID, p_amount INTEGER, p_description TEXT DEFAULT NULL, p_type TEXT DEFAULT 'purchase')
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.user_profiles SET credits = credits + p_amount, updated_at = NOW() WHERE id = p_user_id;
    INSERT INTO public.credit_transactions (user_id, amount, type, description) VALUES (p_user_id, p_amount, p_type, p_description);
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. FUNCTION TO UPDATE USER PLAN
-- ============================================
CREATE OR REPLACE FUNCTION public.update_user_plan(p_user_id UUID, p_plan_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.user_profiles SET plan_type = p_plan_type, updated_at = NOW() WHERE id = p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_plan ON public.user_profiles(plan_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON public.credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_generation_logs_user ON public.generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_created ON public.generation_logs(created_at);

-- ============================================
-- 10. PLANS CONFIGURATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly INTEGER NOT NULL,
    credits_per_month INTEGER NOT NULL,
    features JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.plans (id, name, price_monthly, credits_per_month, features) VALUES
('free', 'Free', 0, 5, '["5 free generations", "Normal queue", "Standard resolution", "Basic support"]'),
('basic', 'Basic', 1999, 400, '["Queue priority", "Guided prompts", "HD resolution", "Email support"]'),
('pro', 'Pro', 3999, 1200, '["Advanced styles", "Fast support", "4K resolution", "Beta access"]'),
('premium', 'Premium', 5999, -1, '["Unlimited generations", "VIP support", "API access", "Custom priority"]')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;

CREATE POLICY "Plans are viewable by everyone"
    ON public.plans FOR SELECT
    USING (true);

-- ============================================
-- 11. FEATURE FLAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT 'true'::jsonb,
    description TEXT,
    category TEXT DEFAULT 'general',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feature flags are viewable by everyone" ON public.feature_flags;
DROP POLICY IF EXISTS "Only admins can modify feature flags" ON public.feature_flags;

CREATE POLICY "Feature flags are viewable by everyone"
    ON public.feature_flags FOR SELECT
    USING (true);

CREATE POLICY "Only admins can modify feature flags"
    ON public.feature_flags FOR ALL
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

-- Insert default feature flags
INSERT INTO public.feature_flags (key, value, description, category) VALUES
('registration_open', 'true', 'Allow new user registrations', 'general'),
('maintenance_mode', 'false', 'Put site in maintenance mode', 'general'),
('beta_mode', 'true', 'Site is in beta mode', 'general'),
('free_plan_enabled', 'true', 'Enable free plan', 'plans'),
('basic_plan_enabled', 'true', 'Enable basic plan ($19.99)', 'plans'),
('pro_plan_enabled', 'true', 'Enable pro plan ($39.99)', 'plans'),
('premium_plan_enabled', 'true', 'Enable premium plan ($59.99)', 'plans'),
('nsfw_generation', 'false', 'Enable NSFW generation (global)', 'features'),
('batch_generation', 'true', 'Enable batch generation', 'features'),
('custom_models', 'true', 'Enable custom model uploads', 'features'),
('history_enabled', 'true', 'Enable generation history', 'features'),
('download_zip', 'true', 'Enable ZIP download for batches', 'features'),
('max_free_generations_daily', '10', 'Max generations per day for free users', 'limits'),
('max_batch_size', '20', 'Maximum images in one batch', 'limits'),
('free_credits_on_register', '5', 'Credits given on registration', 'limits'),
('admin_panel_enabled', 'true', 'Enable admin panel access', 'admin'),
('credit_gifting_enabled', 'true', 'Allow admins to gift credits', 'admin'),
('user_impersonation', 'false', 'Allow admins to impersonate users', 'admin')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 12. USER FEATURES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    value JSONB NOT NULL DEFAULT 'true'::jsonb,
    expires_at TIMESTAMPTZ,
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, feature_key)
);

ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own features" ON public.user_features;
DROP POLICY IF EXISTS "Admins can view all user features" ON public.user_features;
DROP POLICY IF EXISTS "Admins can manage user features" ON public.user_features;

CREATE POLICY "Users can view own features"
    ON public.user_features FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all user features"
    ON public.user_features FOR SELECT
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

CREATE POLICY "Admins can manage user features"
    ON public.user_features FOR ALL
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

-- ============================================
-- 13. FEATURE FLAGS FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT value INTO v_value FROM public.feature_flags WHERE key = p_key;
    IF v_value IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN (v_value::text = 'true');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_user_feature(p_user_id UUID, p_feature_key TEXT)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_feature_value(p_key TEXT, p_default JSONB DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_value JSONB;
BEGIN
    SELECT value INTO v_value FROM public.feature_flags WHERE key = p_key;
    RETURN COALESCE(v_value, p_default);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.grant_user_feature(p_user_id UUID, p_feature_key TEXT, p_value JSONB DEFAULT 'true'::jsonb, p_expires_at TIMESTAMPTZ DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.user_features (user_id, feature_key, value, expires_at, granted_by)
    VALUES (p_user_id, p_feature_key, p_value, p_expires_at, auth.uid())
    ON CONFLICT (user_id, feature_key) 
    DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at, granted_by = EXCLUDED.granted_by;
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.revoke_user_feature(p_user_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.user_features WHERE user_id = p_user_id AND feature_key = p_feature_key;
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_feature_flag(p_key TEXT, p_value JSONB)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.feature_flags SET value = p_value, updated_at = NOW(), updated_by = auth.uid() WHERE key = p_key;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_feature_flag(p_key TEXT, p_value JSONB, p_description TEXT DEFAULT NULL, p_category TEXT DEFAULT 'general')
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.feature_flags (key, value, description, category, updated_by)
    VALUES (p_key, p_value, p_description, p_category, auth.uid())
    ON CONFLICT (key) DO NOTHING;
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 14. FEATURE FLAGS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON public.feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_user_features_user ON public.user_features(user_id);
CREATE INDEX IF NOT EXISTS idx_user_features_key ON public.user_features(feature_key);

-- ============================================
-- 15. APP SETTINGS TABLE (API KEY STORAGE)
-- ============================================
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Only admins can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Only admins can insert app settings" ON public.app_settings;

CREATE POLICY "Only admins can view app settings"
    ON public.app_settings FOR SELECT
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

CREATE POLICY "Only admins can update app settings"
    ON public.app_settings FOR UPDATE
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

CREATE POLICY "Only admins can insert app settings"
    ON public.app_settings FOR INSERT
    WITH CHECK (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

-- Insert default API key placeholder
INSERT INTO public.app_settings (key, value, description) VALUES
('gemini_api_key', 'YOUR_API_KEY_HERE', 'Global Gemini API key for all users')
ON CONFLICT (key) DO NOTHING;

-- Function to update API key (for admins)
CREATE OR REPLACE FUNCTION public.update_api_key(p_new_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.app_settings 
    SET value = p_new_key, 
        updated_at = NOW(), 
        updated_by = auth.uid()
    WHERE key = 'gemini_api_key';
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- After running this script:
-- 1. Create a user through the app
-- 2. Make them admin:
--    UPDATE public.user_profiles SET is_admin = TRUE WHERE email = 'your-email@example.com';
-- 3. Update the API key:
--    UPDATE public.app_settings SET value = 'your-real-api-key' WHERE key = 'gemini_api_key';
--    OR use: SELECT public.update_api_key('your-new-api-key');
--
-- To change API key later (as admin):
-- SELECT public.update_api_key('new-api-key-here');
