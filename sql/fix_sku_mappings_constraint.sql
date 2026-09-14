-- Perbaiki Constraint Unique di Database Supabase
-- Menghapus constraint yang membatasi 1 ID/SKU untuk seluruh database
ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_custom_id_key;
ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_sku_key;
ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_custom_id_gudang_id_key;

-- Menambahkan constraint: SKU unik per gudang (custom_id boleh sama/duplikat karena 1 rak bisa banyak SKU)
ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_sku_gudang_id_key;
ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_sku_gudang_id_key UNIQUE (sku, gudang_id);
