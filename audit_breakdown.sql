-- Desglose: cuantos creditos se cobraron por tipo de operacion
SELECT
  CASE
    WHEN description LIKE 'Fusion analysis%' THEN 'ANALISIS (paso 2)'
    WHEN description LIKE 'Generated image%' THEN 'GENERACION (paso 3)'
    WHEN description LIKE 'Batch generation%' THEN 'BATCH (paso 3)'
    WHEN description LIKE 'Pose variation%' THEN 'POSE VARIATION'
    ELSE 'OTRO: ' || COALESCE(description, 'sin descripcion')
  END AS tipo_operacion,
  COUNT(*) AS cantidad,
  SUM(ABS(amount)) AS creditos_cobrados
FROM public.credit_transactions
WHERE type = 'usage'
GROUP BY tipo_operacion
ORDER BY cantidad DESC;
