-- Run this in your Supabase SQL Editor
CREATE TABLE IF NOT EXISTS sku_bulky (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sku)
);

-- Optional: Enable RLS and add policies if needed
-- ALTER TABLE sku_bulky ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for authenticated" ON sku_bulky FOR ALL TO authenticated USING (true);
-- CREATE POLICY "Allow read for anon" ON sku_bulky FOR SELECT TO anon USING (true);
