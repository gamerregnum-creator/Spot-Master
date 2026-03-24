-- ==========================================
-- 05_CORE_METADATA_AND_INVENTORY: Categorías Globales e Inventario
-- ==========================================

-- 1. Unidades de Medida Extendidas (Para cualquier área comercial)
CREATE TYPE public.unit_measure AS ENUM (
    'UNIDADES', 'GRAMOS', 'KILOS', 'LIBRAS', 'ONZAS', 
    'LITROS', 'MILILITROS', 'GALONES', 'PIES', 'METROS'
);

-- 2. Subcategorías (Nivel 2)

CREATE TABLE IF NOT EXISTS public.business_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES public.business_sections(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ej: 'Pizzería', 'Hamburguesas', 'Farmacia'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Inyectar referencia en Negocios
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.business_subcategories(id) ON DELETE SET NULL;

-- 4. Sistema de Inventario Pro
-- Compatible con cualquier negocio que venda stock físico
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT, -- Código de barras o SKU
    quantity_available DECIMAL(12,2) DEFAULT 0,
    unit_of_measure public.unit_measure DEFAULT 'UNIDADES',
    min_stock_alert DECIMAL(12,2) DEFAULT 0,
    auto_disable_when_empty BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Recetas / Ingredientes (BOM - Bill of Materials)
-- Vincula platos con el inventario
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    quantity_required DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Seguridad (RLS)
ALTER TABLE public.business_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Todo el mundo ve categorías" ON public.business_sections FOR SELECT USING (true); -- Moved to 00
CREATE POLICY "Todo el mundo ve subcategorías" ON public.business_subcategories FOR SELECT USING (true);

CREATE POLICY "Dueños gestionan su inventario" ON public.inventory_items FOR ALL 
USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Dueños gestionan sus recetas" ON public.recipe_ingredients FOR ALL 
USING (menu_item_id IN (SELECT id FROM public.menu_items WHERE business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())));
