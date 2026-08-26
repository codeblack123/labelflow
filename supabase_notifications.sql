-- Create table for global notifications
CREATE TABLE IF NOT EXISTS global_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT -- Optional: to track who created it
);

-- Enable RLS
ALTER TABLE global_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read active notifications
CREATE POLICY "Everyone can read active notifications"
  ON global_notifications
  FOR SELECT
  USING (is_active = true);

-- Policy: Authenticated/Full access for service_role or admin (simplified for now to allow public insert if needed by app logic, but ideally restricted)
-- Since we use Supabase client with anon key usually, we might need to allow insert for "authenticated" or open depending on how Admin auth works.
-- For now, enabling full access for anon (be careful in production!) or rely on App-level PIN security + RLS disabled/permissive.
-- Given existing patterns, we often make it permissive for this prototype.

CREATE POLICY "Enable all access for all users"
    ON global_notifications
    FOR ALL
    USING (true)
    WITH CHECK (true);
