-- SQL to create user productivity timers table for Upload 2 & Massal 2
CREATE TABLE IF NOT EXISTS user_productivity_timers (
    username TEXT PRIMARY KEY,
    timer_end_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS if not already enabled (optional, depending on project security model)
-- ALTER TABLE user_productivity_timers ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow public access to productivity timers" ON user_productivity_timers FOR ALL USING (true);
