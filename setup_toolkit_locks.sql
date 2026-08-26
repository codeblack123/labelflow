-- ============================================================
-- Toolkit Feature Locks Table
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS toolkit_feature_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(feature_key)
);

-- Insert all features as UNLOCKED by default
INSERT INTO toolkit_feature_locks (feature_key, is_locked) VALUES
    ('awb-cleaner',       false),
    ('label-splitter-v2', false),
    ('label-splitter-v3', false),
    ('label-splitter-v4', false),
    ('extract-pesanan',   false),
    ('wms-cleaner',       false),
    ('ginee-processor',   false)
ON CONFLICT (feature_key) DO NOTHING;

-- Optional: Enable RLS and add policies
-- ALTER TABLE toolkit_feature_locks ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow read for anon" ON toolkit_feature_locks FOR SELECT TO anon USING (true);
-- CREATE POLICY "Allow all for authenticated" ON toolkit_feature_locks FOR ALL TO authenticated USING (true);
