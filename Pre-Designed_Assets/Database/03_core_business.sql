-- ==========================================
-- 03_CORE_BUSINESS: Negocios, Menús y Licencias
-- ==========================================

-- 1. Enums de Negocio
CREATE TYPE public.license_type AS ENUM ('COUPON_ONLY', 'MARKETPLACE_ONLY', 'BOTH_ADS');
CREATE TYPE public.license_status AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED');
CREATE TYPE public.modifier_type AS ENUM ('EXTRAS', 'EXCLUSION', 'SIZE');

-- 2. Tabla de Restaurantes / Comercios
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
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
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Ítems de Menú (Con Bacheo Independiente)
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
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
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
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
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

-- Políticas Baseline
CREATE POLICY "Todo el mundo puede ver negocios activos" ON public.restaurants FOR SELECT USING (is_active = true);
CREATE POLICY "Dueños gestionan sus negocios" ON public.restaurants FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Todo el mundo puede ver el menú" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Dueños gestionan sus platos" ON public.menu_items FOR ALL USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));

CREATE POLICY "Todo el mundo puede ver los modificadores" ON public.menu_modifiers FOR SELECT USING (true);
CREATE POLICY "Dueños gestionan sus modificadores" ON public.menu_modifiers FOR ALL 
USING (menu_item_id IN (SELECT id FROM public.menu_items WHERE restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())));

CREATE POLICY "Los negocios ven sus propias licencias" ON public.licenses FOR SELECT USING (restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid()));
CREATE POLICY "Los consejeros ven las licencias que vendieron" ON public.licenses FOR SELECT USING (counselor_id = auth.uid());
