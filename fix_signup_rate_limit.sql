-- ============================================
-- SIGNUP RATE LIMITING - Anti multi-account abuse
-- Run this in Supabase SQL Editor
-- ============================================

-- Table to track signup attempts by IP and device fingerprint
CREATE TABLE IF NOT EXISTS public.signup_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  device_fingerprint TEXT,
  email TEXT,
  user_agent TEXT,
  country TEXT,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by IP and time
CREATE INDEX IF NOT EXISTS idx_signup_attempts_ip_time
  ON public.signup_attempts (ip_address, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_signup_attempts_fp_time
  ON public.signup_attempts (device_fingerprint, created_at DESC)
  WHERE device_fingerprint IS NOT NULL;

-- RLS: only service_role can read/write (no client access)
ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;

-- No policies = no client access. Only service_role (used by Netlify functions) can access.
-- This is intentional - users should never see or modify this table.

-- Grant to service_role only (Netlify functions use service_role key)
GRANT ALL ON public.signup_attempts TO service_role;
REVOKE ALL ON public.signup_attempts FROM authenticated;
REVOKE ALL ON public.signup_attempts FROM anon;

-- Function to check if signup is allowed (called by Netlify function via service_role)
CREATE OR REPLACE FUNCTION public.check_signup_allowed(
  p_ip TEXT,
  p_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_ip_count INTEGER;
  v_fp_count INTEGER;
  v_ip_limit INTEGER := 3;      -- Max 3 signups per IP per 24h
  v_fp_limit INTEGER := 2;      -- Max 2 signups per fingerprint per 24h
  v_window INTERVAL := '24 hours';
BEGIN
  -- Count recent signups from this IP
  SELECT COUNT(*) INTO v_ip_count
  FROM public.signup_attempts
  WHERE ip_address = p_ip
    AND created_at > NOW() - v_window
    AND success = true;

  -- Count recent signups from this fingerprint (if provided)
  IF p_fingerprint IS NOT NULL AND p_fingerprint != '' THEN
    SELECT COUNT(*) INTO v_fp_count
    FROM public.signup_attempts
    WHERE device_fingerprint = p_fingerprint
      AND created_at > NOW() - v_window
      AND success = true;
  ELSE
    v_fp_count := 0;
  END IF;

  -- Return result
  IF v_ip_count >= v_ip_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'ip_limit',
      'message', 'Too many accounts created from this network. Please try again later.',
      'ip_count', v_ip_count,
      'fp_count', v_fp_count
    );
  END IF;

  IF v_fp_count >= v_fp_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'device_limit',
      'message', 'Too many accounts created from this device. Please try again later.',
      'ip_count', v_ip_count,
      'fp_count', v_fp_count
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'ip_count', v_ip_count,
    'fp_count', v_fp_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Auto-cleanup old records (keep 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_signup_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM public.signup_attempts
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
