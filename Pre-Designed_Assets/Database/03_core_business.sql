-- ==========================================
-- 03_CORE_BUSINESS: Negocios, Menús y Licencias
-- ==========================================

-- 1. Enums de Negocio
CREATE TYPE public.license_type AS ENUM ('COUPON_ONLY', 'MARKETPLACE_ONLY', 'BOTH_ADS');
CREATE TYPE public.license_status AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED');
CREATE TYPE public.modifier_type AS ENUM ('EXTRAS', 'EXCLUSION', 'SIZE');

-- 2. Tabla Maestro de Negocios (Hoteles, Médicos, Restaurantes, etc.)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    section_id UUID REFERENCES public.business_sections(id) ON DELETE SET NULL, -- Clasificación principal
    name TEXT NOT NULL,
    description TEXT,
    commission_rate_override DECIMAL(5,2), -- Si es NULL, usa el default de la sección
    logo_url TEXT,
    banner_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_open_now BOOLEAN DEFAULT true,
    max_capacity_per_interval INTEGER DEFAULT 20,
    batch_buffer_mins INTEGER DEFAULT 5, -- Margen base de preparación
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    address_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Categorías de Menú
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Ítems de Menú (Con Bacheo Independiente)
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    menu_category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(12,2) NOT NULL,
    estimated_prep_time_secs INTEGER DEFAULT 600,
    image_url TEXT,
    -- Campos de Bacheo (Fase 2)
    is_batchable BOOLEAN DEFAULT false,
    batch_capacity INTEGER DEFAULT 1, -- Cuántos caben en un mismo ciclo de tiempo
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Modificadores (Extras, Tamaños, etc.)
CREATE TABLE IF NOT EXISTS public.menu_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    type public.modifier_type DEFAULT 'EXTRAS',
    name TEXT NOT NULL,
    price_adjustment DECIMAL(12,2) DEFAULT 0.00,
    time_adjustment_secs INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Licencias Anuales (Marketplace PRD)
CREATE TABLE IF NOT EXISTS public.licenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    counselor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Quién vendió la licencia
    type public.license_type NOT NULL,
    status public.license_status DEFAULT 'PENDING',
    price_paid DECIMAL(12,2) NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    metadata JSONB, -- Para guardar detalles del pago (ej: Tx hash)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Seguridad (RLS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Políticas Baseline
CREATE POLICY "Todo el mundo puede ver negocios activos" ON public.businesses FOR SELECT USING (is_active = true);
CREATE POLICY "Dueños gestionan sus negocios" ON public.businesses FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Todo el mundo puede ver el menú" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Dueños gestionan sus platos" ON public.menu_items FOR ALL USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Todo el mundo puede ver los modificadores" ON public.menu_modifiers FOR SELECT USING (true);
CREATE POLICY "Dueños gestionan sus modificadores" ON public.menu_modifiers FOR ALL 
USING (menu_item_id IN (SELECT id FROM public.menu_items WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())));

CREATE POLICY "Los negocios ven sus propias licencias" ON public.licenses FOR SELECT USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Los consejeros ven las licencias que vendieron" ON public.licenses FOR SELECT USING (counselor_id = auth.uid());

-- ==========================================
-- 7. Unity Pool (Rush Hour por Store)
-- El merchant activa un pool con target de participantes.
-- Cuando se alcanza el objetivo, se realiza una rifa con el monto acumulado.
-- ==========================================

CREATE TYPE public.unity_pool_status AS ENUM ('LIVE', 'WINNER', 'EXPIRED');

CREATE TABLE IF NOT EXISTS public.unity_pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    status public.unity_pool_status DEFAULT 'LIVE',

    -- Target: mínimo 100, máximo 500 clientes
    target_participants INTEGER NOT NULL DEFAULT 200
        CONSTRAINT chk_target_range CHECK (target_participants BETWEEN 100 AND 500),
    current_participants INTEGER NOT NULL DEFAULT 0,
    accumulated_amount DECIMAL(14,4) NOT NULL DEFAULT 0,   -- USDC acumulado en el pool

    -- Comisiones del Rush Hour
    -- Ejemplo: base=5%, rush_hour=20% → diferencia=15% → cada mitad=7.5%
    base_commission_pct    DECIMAL(5,2) NOT NULL,          -- Comisión base del Sector (ej: 5%)
    rush_hour_commission_pct DECIMAL(5,2) NOT NULL,        -- Comisión Rush Hour del merchant (ej: 20%)
    client_discount_pct    DECIMAL(5,2) NOT NULL,          -- 50% diferencia → descuento al cliente (ej: 7.5%)
    pool_contribution_pct  DECIMAL(5,2) NOT NULL,          -- 50% diferencia → acumulado al pool (ej: 7.5%)

    CONSTRAINT chk_rush_hour_gt_base CHECK (rush_hour_commission_pct > base_commission_pct),
    CONSTRAINT chk_pcts_consistent CHECK (
        client_discount_pct = (rush_hour_commission_pct - base_commission_pct) / 2 AND
        pool_contribution_pct = (rush_hour_commission_pct - base_commission_pct) / 2
    ),

    allow_multi_entry BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.unity_pool_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID NOT NULL REFERENCES public.unity_pools(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    transaction_id UUID,                                   -- Referencia a la orden/transacción
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para verificación rápida de participación única
CREATE INDEX IF NOT EXISTS idx_unity_participants_pool_user
    ON public.unity_pool_participants(pool_id, user_id);

-- Seguridad (RLS)
ALTER TABLE public.unity_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unity_pool_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants gestionan sus unity pools" ON public.unity_pools
    FOR ALL USING (merchant_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Usuarios ven sus participaciones" ON public.unity_pool_participants
    FOR SELECT USING (user_id = auth.uid());
