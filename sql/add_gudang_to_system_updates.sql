-- ============================================================
-- Add target_type and target_gudang_ids to system_updates
-- Run this in your Supabase SQL Editor if you manage the DB directly
-- ============================================================

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_updates' AND column_name = 'target_type'
    ) THEN
        ALTER TABLE system_updates ADD COLUMN target_type TEXT DEFAULT 'all';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'system_updates' AND column_name = 'target_gudang_ids'
    ) THEN
        ALTER TABLE system_updates ADD COLUMN target_gudang_ids UUID[] DEFAULT NULL;
    END IF;
END $$;
