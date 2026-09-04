-- ============================================================
-- Add target_type and target_gudang_ids to system_updates
-- Jalankan query ini di Supabase SQL Editor
-- ============================================================

ALTER TABLE IF EXISTS system_updates 
ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'all';

ALTER TABLE IF EXISTS system_updates 
ADD COLUMN IF NOT EXISTS target_gudang_ids TEXT[] DEFAULT NULL;

-- Opsional: Aktifkan Realtime agar notifikasi pop-up langsung muncul tanpa perlu refresh
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'system_updates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE system_updates;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

