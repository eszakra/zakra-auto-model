-- REED Service Purchases Schema
-- Run this in Supabase SQL Editor

-- Service purchases table
CREATE TABLE IF NOT EXISTS service_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id VARCHAR(50) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  service_category VARCHAR(20) NOT NULL CHECK (service_category IN ('workflow', 'lora', 'package')),
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'delivered')),
  coinbase_charge_code VARCHAR(50),
  photos_uploaded BOOLEAN DEFAULT FALSE,
  download_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_purchases_user_id ON service_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_service_purchases_status ON service_purchases(status);
CREATE INDEX IF NOT EXISTS idx_service_purchases_service_id ON service_purchases(service_id);

-- RLS
ALTER TABLE service_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own service purchases"
  ON service_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own purchases (for photo upload status)
CREATE POLICY "Users can update own service purchases"
  ON service_purchases FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert (webhook)
CREATE POLICY "Service role can insert service purchases"
  ON service_purchases FOR INSERT
  WITH CHECK (true);

-- Grants
GRANT SELECT, UPDATE ON service_purchases TO authenticated;
GRANT INSERT ON service_purchases TO service_role;

-- Create storage bucket for LoRA uploads (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('lora-uploads', 'lora-uploads', false);
