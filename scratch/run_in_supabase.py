# ===================================================================
# JALANKAN SQL BERIKUT DI SUPABASE DASHBOARD > SQL EDITOR
# ===================================================================
#
# LANGKAH 1: Assign semua data lama yang gudang_id-nya NULL ke Gudang Jakarta
#
# UPDATE sku_mappings 
# SET gudang_id = '184b8a0e-665c-4519-b70b-e5de2287452a' 
# WHERE gudang_id IS NULL;
#
# LANGKAH 2: Pastikan gudang_id tidak boleh NULL lagi ke depannya
#
# ALTER TABLE sku_mappings ALTER COLUMN gudang_id SET NOT NULL;
#
# LANGKAH 3: Hapus constraint unique global, ganti dengan per-gudang
#
# ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_custom_id_key;
# ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_sku_key;
# ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_custom_id_gudang_id_key UNIQUE (custom_id, gudang_id);
# ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_sku_gudang_id_key UNIQUE (sku, gudang_id);
#
# ===================================================================
print("Baca komentar di atas dan jalankan SQL di Supabase Dashboard")
