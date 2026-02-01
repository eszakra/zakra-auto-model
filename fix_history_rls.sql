-- ============================================
-- ARREGLAR HISTORIAL POR USUARIO Y RLS
-- ============================================

-- 1. Asegurar que generation_logs tiene las columnas necesarias
ALTER TABLE public.generation_logs 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending'));

-- 2. Actualizar registros existentes sin user_id (opcional - asignar a un admin)
-- UPDATE public.generation_logs SET user_id = 'TU_USER_ID_ADMIN' WHERE user_id IS NULL;

-- 3. Hacer user_id NOT NULL para registros futuros
ALTER TABLE public.generation_logs ALTER COLUMN user_id SET NOT NULL;

-- 4. Eliminar políticas antiguas que causan recursión
DROP POLICY IF EXISTS "Users can view own generations" ON public.generation_logs;
DROP POLICY IF EXISTS "Users can insert own generations" ON public.generation_logs;
DROP POLICY IF EXISTS "Admins can view all generations" ON public.generation_logs;

-- 5. Crear función is_admin si no existe
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = user_id AND is_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Crear nuevas políticas sin recursión
CREATE POLICY "Users can view own generations"
    ON public.generation_logs FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own generations"
    ON public.generation_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 7. Verificar que todo está correcto
SELECT 
    'Políticas actualizadas correctamente' as status,
    (SELECT COUNT(*) FROM public.generation_logs) as total_records,
    (SELECT COUNT(*) FROM public.generation_logs WHERE user_id IS NOT NULL) as records_with_user;
