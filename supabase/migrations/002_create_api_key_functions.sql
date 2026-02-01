-- Función para obtener API key
CREATE OR REPLACE FUNCTION get_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_api_key TEXT;
BEGIN
  -- Intentar obtener del secret (esto no funcionará desde RPC)
  -- Obtenemos de la tabla
  SELECT value INTO v_api_key
  FROM system_config
  WHERE key = 'gemini_api_key';
  
  RETURN v_api_key;
END;
$$;

-- Función para actualizar API key (solo admins)
CREATE OR REPLACE FUNCTION update_api_key(p_api_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario es admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Actualizar la API key
  INSERT INTO system_config (key, value, description, updated_at)
  VALUES ('gemini_api_key', p_api_key, 'Gemini API key', NOW())
  ON CONFLICT (key) 
  DO UPDATE SET 
    value = p_api_key,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$;
