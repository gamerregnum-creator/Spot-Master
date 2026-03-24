-- ==========================================
-- 04_SEED_DATA: Datos Iniciales y Categorías
-- ==========================================

-- 1. Secciones Globales (Nivel 1) con Comisiones por Defecto
INSERT INTO public.business_sections (name, default_commission_rate, icon_url) VALUES 
('Gastronomía', 5.00, 'utensils'),
('Tiendas / Retail', 5.00, 'shopping-bag'),
('Hoteles y Alojamiento', 10.00, 'bed'),
('Transporte / Taxi', 10.00, 'car'),
('Salud y Belleza', 5.00, 'sparkles'),
('Servicios Profesionales', 5.00, 'briefcase')
ON CONFLICT (name) DO UPDATE SET default_commission_rate = EXCLUDED.default_commission_rate;

-- 2. Subcategorías (Nivel 2) - Opcionales pero útiles para filtros
DO $$
DECLARE
    food_id UUID;
    retail_id UUID;
BEGIN
    SELECT id INTO food_id FROM public.business_sections WHERE name = 'Gastronomía';
    SELECT id INTO retail_id FROM public.business_sections WHERE name = 'Tiendas / Retail';

    -- Comida
    INSERT INTO public.business_subcategories (section_id, name) VALUES 
    (food_id, 'Pizzería'),
    (food_id, 'Hamburguesas'),
    (food_id, 'Comida Árabe'),
    (food_id, 'Repostería / Postres'),
    (food_id, 'Bebidas / Café')
    ON CONFLICT DO NOTHING;

    -- Retail
    INSERT INTO public.business_subcategories (section_id, name) VALUES 
    (retail_id, 'Ferretería'),
    (retail_id, 'Farmacia'),
    (retail_id, 'Ropa y Accesorios'),
    (retail_id, 'Electrónica')
    ON CONFLICT DO NOTHING;
END $$;

-- 3. Función para Categorías de Platos/Servicios (Internas del negocio)
CREATE OR REPLACE FUNCTION public.seed_business_categories(biz_id UUID)
RETURNS VOID AS $$
DECLARE
    cats TEXT[] := ARRAY[
        'Ofertas',
        'Populares',
        'Nuevo'
    ];
    cat TEXT;
    i INTEGER := 1;
BEGIN
    FOREACH cat IN ARRAY cats LOOP
        INSERT INTO public.menu_categories (business_id, name, sort_order)
        VALUES (biz_id, cat, i)
        ON CONFLICT DO NOTHING;
        i := i + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para Categorías Automáticas
CREATE OR REPLACE FUNCTION public.on_business_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.seed_business_categories(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_seed_categories ON public.businesses;
CREATE TRIGGER trigger_seed_categories
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE PROCEDURE public.on_business_created();
