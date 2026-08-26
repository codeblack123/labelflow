-- Create table for system updates
CREATE TABLE IF NOT EXISTS system_updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  version_code TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  download_link TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_updates ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read
CREATE POLICY "Everyone can read system updates"
  ON system_updates
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert/update (for the admin panel)
-- We use permissive true for now to allow simple frontend logic to update it
CREATE POLICY "Enable all access for all users"
    ON system_updates
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Insert a default row if none exists (just as a placeholder for the frontend to update later)
INSERT INTO system_updates (id, version_code, title, instructions, download_link, is_active)
SELECT uuid_generate_v4(), 'v1.0', 'Sistem Baru Saja Diperbarui!', 'Silakan download update terbaru melalui link di bawah.', 'https://google.com', false
WHERE NOT EXISTS (SELECT 1 FROM system_updates LIMIT 1);
