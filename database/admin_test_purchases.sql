-- Test purchases for admin user (d5634917-6130-4f15-987e-17d878af8507)
-- Run in Supabase SQL Editor

INSERT INTO service_purchases (user_id, service_id, service_name, service_category, amount, status, photos_uploaded) VALUES
  ('d5634917-6130-4f15-987e-17d878af8507', 'workflow-inpainting', 'Inpainting Pro', 'workflow', 397, 'ready', false),
  ('d5634917-6130-4f15-987e-17d878af8507', 'workflow-controlnet', 'ControlNet Poses', 'workflow', 697, 'delivered', false),
  ('d5634917-6130-4f15-987e-17d878af8507', 'workflow-elite', 'Elite Bundle', 'workflow', 997, 'processing', false),
  ('d5634917-6130-4f15-987e-17d878af8507', 'lora-basic', 'Basic LoRA', 'lora', 47, 'processing', false),
  ('d5634917-6130-4f15-987e-17d878af8507', 'lora-advanced', 'Advanced LoRA', 'lora', 147, 'ready', true),
  ('d5634917-6130-4f15-987e-17d878af8507', 'package-starter', 'Starter', 'package', 297, 'processing', false),
  ('d5634917-6130-4f15-987e-17d878af8507', 'package-pro', 'Pro', 'package', 597, 'delivered', true),
  ('d5634917-6130-4f15-987e-17d878af8507', 'package-elite', 'Elite', 'package', 997, 'ready', true);
