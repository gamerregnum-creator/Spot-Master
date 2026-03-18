-- ==========================================
-- 02_CORE_FINANCES: Wallets, Ledger y Comisiones
-- ==========================================

-- 1. Enums Financieros
CREATE TYPE public.wallet_type AS ENUM ('EARNINGS', 'INTERNAL_CREDIT', 'CASHBACK', 'ROYALTIES', 'PROMO_POOL', 'COMPANY_REVENUE');
CREATE TYPE public.ledger_category AS ENUM ('SALE_DISTRIBUTION', 'LICENSE_PURCHASE', 'WITHDRAWAL', 'DEPOSIT', 'FEE_PAYMENT', 'BONUS_PAYOUT');

-- 2. Tabla Maestro de Carteras (Polimórfica)
-- Un usuario puede tener múltiples carteras según su rol
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    type public.wallet_type NOT NULL,
    balance DECIMAL(15,4) DEFAULT 0.0000,
    is_frozen BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, type)
);

-- 3. Ledger (Libro Mayor Inmutable)
-- La ÚNICA fuente de verdad. Los balances de 'wallets' son reflejos del Ledger.
CREATE TABLE IF NOT EXISTS public.ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id),
    amount DECIMAL(15,4) NOT NULL, -- Positivo para depósitos, Negativo para cargos
    category public.ledger_category NOT NULL,
    description TEXT,
    reference_id UUID, -- ID de Orden, Licencia, etc.
    metadata JSONB, -- Para guardar detalles del split (ej: { "pct": 0.05 })
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Trigger de Sincronización Automática de Balance
-- Garantiza que el balance en 'wallets' sea la suma de su Ledger
CREATE OR REPLACE FUNCTION public.sync_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.wallets
    SET balance = balance + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.wallet_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ledger_entry_inserted
  AFTER INSERT ON public.ledger
  FOR EACH ROW EXECUTE PROCEDURE public.sync_wallet_balance();

-- 5. Inicialización de Wallets Core (Empresa y Pool)
-- Estas wallets no pertenecen a un usuario humano
-- INSERT INTO public.wallets (type) VALUES ('COMPANY_REVENUE'), ('PROMO_POOL');

-- 6. RLS Financiero (Máxima Seguridad)
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios ven sus propias carteras"
    ON public.wallets FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Los usuarios ven su propio historial de ledger"
    ON public.ledger FOR SELECT
    USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

CREATE POLICY "Admin tiene control total"
    ON public.wallets FOR ALL
    USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'ADMIN'));
