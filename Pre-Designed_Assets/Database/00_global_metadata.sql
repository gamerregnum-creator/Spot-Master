-- ==========================================
-- 00_GLOBAL_METADATA: Secciones y Tipos Base
-- ==========================================

-- 1. Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Categorías Globales de Negocio
CREATE TABLE IF NOT EXISTS public.business_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    default_commission_rate DECIMAL(5,2) DEFAULT 5.00,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.business_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todo el mundo ve categorías" ON public.business_sections FOR SELECT USING (true);
