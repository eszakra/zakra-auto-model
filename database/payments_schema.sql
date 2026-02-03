-- REED Payment System Database Schema
-- Run this in Supabase SQL Editor

-- Plans table (subscription tiers)
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  price_monthly DECIMAL(10, 2) NOT NULL,
  credits_per_month INTEGER NOT NULL,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans (high margin pricing)
INSERT INTO plans (name, price_monthly, credits_per_month, features, is_active) VALUES
  ('Free', 0.00, 3, '{"nsfw": false, "queue": "normal", "resolution": "standard", "support": "community"}', true),
  ('Starter', 29.00, 50, '{"nsfw": "soon", "queue": "priority", "resolution": "hd", "support": "email", "guided_prompts": true}', true),
  ('Creator', 59.00, 120, '{"nsfw": true, "queue": "priority", "resolution": "4k", "support": "fast", "advanced_styles": true, "beta_access": true}', true),
  ('Pro', 99.00, 250, '{"nsfw": true, "queue": "priority", "resolution": "4k", "support": "priority", "custom_presets": true, "early_access": true}', true),
  ('Studio', 199.00, 600, '{"nsfw": "full", "queue": "vip", "resolution": "4k", "support": "1on1", "api_access": true, "white_label": true}', true)
ON CONFLICT (name) DO NOTHING;

-- Payments table (crypto payment tracking)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  payment_id VARCHAR(20) NOT NULL UNIQUE, -- REED-XXXXXX format
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
  wallet_address VARCHAR(100) NOT NULL,
  tx_hash VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'waiting', 'confirmed', 'expired', 'failed')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_expires_at ON payments(expires_at) WHERE status = 'waiting';

-- Credit transactions table (for tracking credit additions/usage)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('subscription', 'purchase', 'usage', 'bonus', 'refund')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);

-- Function to increment credits
CREATE OR REPLACE FUNCTION increment_credits(user_id_param UUID, amount_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_credits INTEGER;
BEGIN
  UPDATE user_profiles
  SET credits = credits + amount_param,
      updated_at = NOW()
  WHERE id = user_id_param
  RETURNING credits INTO new_credits;

  RETURN new_credits;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire old payments
CREATE OR REPLACE FUNCTION expire_old_payments()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE payments
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'waiting'
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can only view their own payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own payments
CREATE POLICY "Users can create own payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only service role can update payments (for blockchain verification)
CREATE POLICY "Service role can update payments"
  ON payments FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for plans (publicly readable)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are publicly readable"
  ON plans FOR SELECT
  USING (true);

-- Grant necessary permissions
GRANT SELECT ON plans TO anon, authenticated;
GRANT SELECT, INSERT ON payments TO authenticated;
GRANT SELECT ON credit_transactions TO authenticated;
