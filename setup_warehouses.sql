-- 1. Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default warehouse fallback if needed
INSERT INTO warehouses (name) VALUES ('Gudang Jakarta'), ('Gudang Surabaya') ON CONFLICT DO NOTHING;

-- 2. Add gudang_id to sku_mappings if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'sku_mappings' AND column_name = 'gudang_id') THEN
        ALTER TABLE sku_mappings ADD COLUMN gudang_id UUID REFERENCES warehouses(id);
    END IF;
END $$;

-- 3. Add assigned_warehouses to auth_users if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'auth_users' AND column_name = 'assigned_warehouses') THEN
        ALTER TABLE auth_users ADD COLUMN assigned_warehouses UUID[] DEFAULT '{}';
    END IF;
END $$;

-- 4. Enable RLS (Optional, standard setup)
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and create warehouses (for admin functionality)
-- Warning: Replace 'true' with proper role checks if you have strict RLS enforced on this project

DROP POLICY IF EXISTS "Allow select on warehouses" ON warehouses;
CREATE POLICY "Allow select on warehouses" ON warehouses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert on warehouses" ON warehouses;
CREATE POLICY "Allow insert on warehouses" ON warehouses FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update on warehouses" ON warehouses;
CREATE POLICY "Allow update on warehouses" ON warehouses FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete on warehouses" ON warehouses;
CREATE POLICY "Allow delete on warehouses" ON warehouses FOR DELETE USING (true);

-- 5. Drop global UNIQUE constraints on sku_mappings to allow same SKU/ID in different warehouses
ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_custom_id_key;
ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_sku_key;

-- Add unique constraint per warehouse (SKU and ID can exist in multiple warehouses independently)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sku_mappings_sku_gudang_key'
    ) THEN
        ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_sku_gudang_key UNIQUE (sku, gudang_id);
    END IF;
END $$;
