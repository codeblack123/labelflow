-- Create sku_vip_50k table for Orderan Kilat >50K feature
CREATE TABLE IF NOT EXISTS public.sku_vip_50k (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sku_vip_50k ENABLE ROW LEVEL SECURITY;

-- Create policies for sku_vip_50k
CREATE POLICY "Enable read access for all users" ON public.sku_vip_50k
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Enable insert access for all users" ON public.sku_vip_50k
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON public.sku_vip_50k
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON public.sku_vip_50k
    FOR DELETE
    TO public
    USING (true);
