-- ============================================================
-- Add enabled_gudang_ids to toolkit_feature_locks
-- Run this in your Supabase SQL Editor if you manage the DB directly
-- ============================================================

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'toolkit_feature_locks' AND column_name = 'enabled_gudang_ids'
    ) THEN
        ALTER TABLE toolkit_feature_locks ADD COLUMN enabled_gudang_ids UUID[] DEFAULT NULL;
    END IF;
END $$;
