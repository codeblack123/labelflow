-- Perbaiki Constraint Unique di Database Supabase
-- Menghapus constraint yang membatasi 1 ID/SKU untuk seluruh database
ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_custom_id_key;
ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_sku_key;

-- Menambahkan constraint baru: ID/SKU hanya boleh unik di dalam 1 gudang yang sama
ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_custom_id_gudang_id_key UNIQUE (custom_id, gudang_id);
ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_sku_gudang_id_key UNIQUE (sku, gudang_id);
