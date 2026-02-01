-- ============================================
-- MIGRACIÓN: Crear perfiles para usuarios existentes
-- y arreglar trigger para futuros usuarios
-- ============================================

-- ============================================
-- 1. INSERTAR PERFILES PARA USUARIOS EXISTENTES
-- ============================================
-- Esto creará automáticamente los perfiles para los 4 usuarios que ya existen
INSERT INTO public.user_profiles (
    id, 
    email, 
    full_name, 
    avatar_url,
    plan_type, 
    credits, 
    total_generations, 
    is_admin, 
    email_verified,
    subscription_status,
    created_at, 
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name',
        au.raw_user_meta_data->>'name',
        au.user_metadata->>'full_name',
        au.user_metadata->>'name',
        split_part(au.email, '@', 1)
    ),
    COALESCE(
        au.raw_user_meta_data->>'avatar_url',
        au.user_metadata->>'avatar_url'
    ),
    'free',
    5,
    0,
    false,
    COALESCE(au.email_confirmed_at IS NOT NULL, false),
    'inactive',
    COALESCE(au.created_at, NOW()),
    COALESCE(au.updated_at, NOW())
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- ============================================
-- 2. VERIFICAR QUE SE CREARON LOS PERFILES
-- ============================================
SELECT 
    id,
    email,
    full_name,
    plan_type,
    credits,
    is_admin,
    created_at
FROM public.user_profiles
ORDER BY created_at DESC;

-- ============================================
-- 3. RECREAR EL TRIGGER PARA FUTUROS USUARIOS
-- ============================================
-- Primero eliminamos el trigger y función existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Creamos la función mejorada con manejo de errores
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si ya existe el perfil (por si acaso)
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
        INSERT INTO public.user_profiles (
            id, 
            email, 
            full_name, 
            plan_type, 
            credits,
            total_generations,
            is_admin,
            email_verified,
            subscription_status,
            created_at,
            updated_at
        )
        VALUES (
            NEW.id, 
            NEW.email, 
            COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'name',
                NEW.user_metadata->>'full_name',
                NEW.user_metadata->>'name',
                split_part(NEW.email, '@', 1)
            ),
            'free', 
            5,
            0,
            false,
            COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
            'inactive',
            COALESCE(NEW.created_at, NOW()),
            COALESCE(NEW.updated_at, NOW())
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error (aparecerá en los logs de Supabase)
        RAISE LOG 'Error en handle_new_user para usuario %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Creamos el trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. VERIFICAR QUE EL TRIGGER ESTÁ ACTIVO
-- ============================================
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    CASE tgtype::int & 2 
        WHEN 2 THEN 'BEFORE'
        ELSE 'AFTER'
    END AS timing,
    CASE tgtype::int & 28
        WHEN 4 THEN 'INSERT'
        WHEN 8 THEN 'DELETE'
        WHEN 16 THEN 'UPDATE'
        ELSE 'MULTIPLE'
    END AS event
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass
AND NOT tgisinternal;

-- ============================================
-- 5. HACER ADMIN A UN USUARIO ESPECÍFICO (opcional)
-- ============================================
-- Descomenta y cambia el email para hacer admin a alguien:
-- UPDATE public.user_profiles 
-- SET is_admin = TRUE 
-- WHERE email = 'contact.zakra@gmail.com';

-- ============================================
-- 6. VERIFICACIÓN FINAL
-- ============================================
-- Contar usuarios en auth.users vs user_profiles
SELECT 
    'auth.users' AS tabla,
    COUNT(*) AS total_usuarios
FROM auth.users
UNION ALL
SELECT 
    'user_profiles' AS tabla,
    COUNT(*) AS total_usuarios
FROM public.user_profiles;
