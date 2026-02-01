-- ============================================
-- REED APP SETTINGS - API KEY STORAGE
-- ============================================
-- Run this in Supabase SQL Editor
-- This creates a secure table to store the API key
-- ============================================

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Only admins can view app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Only admins can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Only admins can insert app settings" ON public.app_settings;

-- Create policies - Only admins can access
CREATE POLICY "Only admins can view app settings"
    ON public.app_settings FOR SELECT
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

CREATE POLICY "Only admins can update app settings"
    ON public.app_settings FOR UPDATE
    USING (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

CREATE POLICY "Only admins can insert app settings"
    ON public.app_settings FOR INSERT
    WITH CHECK (COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false) = true);

-- Insert default API key (you need to update this with your real API key)
INSERT INTO public.app_settings (key, value, description) VALUES
('gemini_api_key', 'YOUR_API_KEY_HERE', 'Global Gemini API key for all users')
ON CONFLICT (key) DO NOTHING;

-- Create function to update API key (for admins)
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

-- Create function to get API key (for authenticated users)
CREATE OR REPLACE FUNCTION public.get_api_key()
RETURNS TEXT AS $$
DECLARE
    v_key TEXT;
BEGIN
    SELECT value INTO v_key FROM public.app_settings WHERE key = 'gemini_api_key';
    RETURN v_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INSTRUCTIONS:
-- ============================================
-- 1. Run this SQL first
-- 2. Then update the API key with your real key:
--    UPDATE public.app_settings 
--    SET value = 'your-real-api-key-here' 
--    WHERE key = 'gemini_api_key';
-- 
-- 3. To change the API key later, run:
--    SELECT public.update_api_key('your-new-api-key');
--    (Must be logged in as admin)
-- ============================================
