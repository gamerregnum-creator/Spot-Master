-- ==========================================
-- 01_CORE_IDENTITY: Identidad, Roles y Perfiles
-- ==========================================

-- 1. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Enums Maestro de Roles (Basado en PRD)
-- CUSTOMER: Usuario final que compra
-- BUSINESS: Dueño de comercio que vende
-- COUNSELOR: Agente que afilia comercios
-- ADMIN: Administrador global del sistema
CREATE TYPE public.app_role AS ENUM ('CUSTOMER', 'BUSINESS', 'COUNSELOR', 'ADMIN');

-- 3. Tabla Maestro de Perfiles
-- Vinculada directamente a auth.users de Supabase
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    role public.app_role DEFAULT 'CUSTOMER',
    referred_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Disparador de Creación Automática de Perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, role, referred_by)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'CUSTOMER'),
    (NEW.raw_user_meta_data->>'referred_by')::uuid
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Seguridad Baseline (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver su propio perfil"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Todo el mundo puede ver perfiles básicos de negocios y consejeros"
    ON public.user_profiles FOR SELECT
    USING (role IN ('BUSINESS', 'COUNSELOR'));
