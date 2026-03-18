-- ==========================================
-- 04_SEED_DATA: Datos Iniciales y Categorías
-- ==========================================

-- 1. Secciones Globales (Nivel 1)
INSERT INTO public.business_sections (name, icon_url) VALUES 
('Comida', 'utensils'),
('Tiendas / Retail', 'shopping-bag'),
('Servicios Profesionales', 'briefcase'),
('Salud y Belleza', 'sparkles')
ON CONFLICT (name) DO NOTHING;

-- 2. Subcategorías (Nivel 2)
DO $$
DECLARE
    food_id UUID;
    retail_id UUID;
BEGIN
    SELECT id INTO food_id FROM public.business_sections WHERE name = 'Comida';
    SELECT id INTO retail_id FROM public.business_sections WHERE name = 'Tiendas / Retail';

    -- Comida
    INSERT INTO public.business_subcategories (section_id, name) VALUES 
    (food_id, 'Pizzería'),
    (food_id, 'Hamburguesas'),
    (food_id, 'Comida Árabe'),
    (food_id, 'Repostería / Postres'),
    (food_id, 'Bebidas / Café');

    -- Retail
    INSERT INTO public.business_subcategories (section_id, name) VALUES 
    (retail_id, 'Ferretería'),
    (retail_id, 'Farmacia'),
    (retail_id, 'Ropa y Accesorios'),
    (retail_id, 'Electrónica');
END $$;

-- 3. Función para Categorías de Platos (Internas del restaurante)
CREATE OR REPLACE FUNCTION public.seed_restaurant_categories(rest_id UUID)
RETURNS VOID AS $$
DECLARE
    cats TEXT[] := ARRAY[
        'Entradas',
        'Plato fuerte',
        'Acompañamientos',
        'Postres',
        'Bebidas',
        'Ofertas'
    ];
    cat TEXT;
    i INTEGER := 1;
BEGIN
    FOREACH cat IN ARRAY cats LOOP
        INSERT INTO public.menu_categories (restaurant_id, name, sort_order)
        VALUES (rest_id, cat, i)
        ON CONFLICT DO NOTHING;
        i := i + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para Categorías Automáticas
CREATE OR REPLACE FUNCTION public.on_restaurant_created()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.seed_restaurant_categories(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_seed_categories ON public.restaurants;
CREATE TRIGGER trigger_seed_categories
  AFTER INSERT ON public.restaurants
  FOR EACH ROW EXECUTE PROCEDURE public.on_restaurant_created();
