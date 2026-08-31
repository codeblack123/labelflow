-- ============================================================
-- SQL Setup: SKU VIP (>10K) and SKU VIP (>20K)
-- ============================================================

-- 1. Create sku_vip_10k table
CREATE TABLE IF NOT EXISTS public.sku_vip_10k (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for sku_vip_10k
ALTER TABLE public.sku_vip_10k ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on sku_vip_10k" ON public.sku_vip_10k
    FOR SELECT TO public USING (true);

CREATE POLICY "Enable insert access for all users on sku_vip_10k" ON public.sku_vip_10k
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Enable update access for all users on sku_vip_10k" ON public.sku_vip_10k
    FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users on sku_vip_10k" ON public.sku_vip_10k
    FOR DELETE TO public USING (true);


-- 2. Create sku_vip_20k table
CREATE TABLE IF NOT EXISTS public.sku_vip_20k (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for sku_vip_20k
ALTER TABLE public.sku_vip_20k ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users on sku_vip_20k" ON public.sku_vip_20k
    FOR SELECT TO public USING (true);

CREATE POLICY "Enable insert access for all users on sku_vip_20k" ON public.sku_vip_20k
    FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Enable update access for all users on sku_vip_20k" ON public.sku_vip_20k
    FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete access for all users on sku_vip_20k" ON public.sku_vip_20k
    FOR DELETE TO public USING (true);
