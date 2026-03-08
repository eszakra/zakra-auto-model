-- ============================================
-- ADD body_image COLUMN TO saved_models
-- Run this in the Supabase SQL Editor
-- ============================================

ALTER TABLE public.saved_models
ADD COLUMN IF NOT EXISTS body_image TEXT;
