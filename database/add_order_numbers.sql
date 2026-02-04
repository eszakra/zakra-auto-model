-- Add order number to service_purchases
-- Run in Supabase SQL Editor

-- 1. Add order_number column
ALTER TABLE service_purchases ADD COLUMN IF NOT EXISTS order_number VARCHAR(20);

-- 2. Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS service_order_seq START 1001;

-- 3. Create function to auto-generate order number on insert
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'REED-' || LPAD(nextval('service_order_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS set_order_number ON service_purchases;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON service_purchases
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();

-- 5. Delete old test data and re-insert (trigger auto-generates order numbers)
DELETE FROM service_purchases WHERE user_id = 'd5634917-6130-4f15-987e-17d878af8507';

INSERT INTO service_purchases (user_id, service_id, service_name, service_category, amount, status, photos_uploaded) VALUES
('d5634917-6130-4f15-987e-17d878af8507', 'workflow-inpainting', 'Inpainting Pro', 'workflow', 397, 'delivered', false),
('d5634917-6130-4f15-987e-17d878af8507', 'workflow-controlnet', 'ControlNet Poses', 'workflow', 697, 'delivered', false),
('d5634917-6130-4f15-987e-17d878af8507', 'workflow-elite', 'Elite Bundle', 'workflow', 997, 'delivered', false),
('d5634917-6130-4f15-987e-17d878af8507', 'lora-basic', 'Basic LoRA', 'lora', 47, 'processing', false),
('d5634917-6130-4f15-987e-17d878af8507', 'lora-advanced', 'Advanced LoRA', 'lora', 147, 'ready', true),
('d5634917-6130-4f15-987e-17d878af8507', 'package-starter', 'Starter', 'package', 297, 'processing', false),
('d5634917-6130-4f15-987e-17d878af8507', 'package-pro', 'Pro', 'package', 597, 'delivered', true),
('d5634917-6130-4f15-987e-17d878af8507', 'package-elite', 'Elite', 'package', 997, 'ready', true);
