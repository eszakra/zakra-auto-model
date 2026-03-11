-- ============================================
-- REED CREDITS AUDIT - DIAGNOSTICO
-- NO modifica nada, solo consulta
-- Ejecuta en Supabase SQL Editor
-- ============================================


-- 1. Usuarios que generaron MAS de lo que sus creditos permiten
-- (total_generations alto pero creditos no bajaron proporcionalmente)
SELECT
  up.id,
  up.email,
  up.full_name,
  up.plan_type,
  up.credits AS credits_actuales,
  up.total_generations,
  up.created_at,
  -- Cuantos creditos se le descontaron realmente (transacciones de uso)
  COALESCE(ABS(SUM(ct.amount) FILTER (WHERE ct.type = 'usage')), 0) AS credits_realmente_usados,
  -- Cuantos creditos se le dieron (compras, bonus, admin)
  COALESCE(SUM(ct.amount) FILTER (WHERE ct.type != 'usage' AND ct.amount > 0), 0) AS credits_recibidos,
  -- DIFERENCIA: generaciones sin pagar
  up.total_generations - COALESCE(ABS(SUM(ct.amount) FILTER (WHERE ct.type = 'usage')), 0) AS generaciones_sin_pagar
FROM public.user_profiles up
LEFT JOIN public.credit_transactions ct ON ct.user_id = up.id
GROUP BY up.id, up.email, up.full_name, up.plan_type, up.credits, up.total_generations, up.created_at
HAVING up.total_generations > COALESCE(ABS(SUM(ct.amount) FILTER (WHERE ct.type = 'usage')), 0)
ORDER BY (up.total_generations - COALESCE(ABS(SUM(ct.amount) FILTER (WHERE ct.type = 'usage')), 0)) DESC;


-- 2. Resumen general del abuso
SELECT
  COUNT(*) AS total_usuarios,
  SUM(total_generations) AS total_generaciones_hechas,
  (SELECT COALESCE(ABS(SUM(amount)), 0) FROM credit_transactions WHERE type = 'usage') AS total_creditos_cobrados,
  SUM(total_generations) - (SELECT COALESCE(ABS(SUM(amount)), 0) FROM credit_transactions WHERE type = 'usage') AS generaciones_regaladas
FROM public.user_profiles
WHERE total_generations > 0;


-- 3. Usuarios con creditos sospechosamente altos (posible manipulacion)
SELECT
  id, email, full_name, plan_type, credits, total_generations, created_at
FROM public.user_profiles
WHERE credits > 100 AND plan_type = 'free'
ORDER BY credits DESC;


-- 4. Verificar si la funcion use_credits existe
SELECT
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('use_credits', 'add_credits');


-- 5. Ver las ultimas 20 transacciones de creditos (si hay alguna)
SELECT
  ct.id,
  ct.user_id,
  up.email,
  ct.amount,
  ct.type,
  ct.description,
  ct.created_at
FROM public.credit_transactions ct
JOIN public.user_profiles up ON up.id = ct.user_id
ORDER BY ct.created_at DESC
LIMIT 20;
