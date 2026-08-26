-- 1. Tambahkan kolom ke auth_users
ALTER TABLE auth_users 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'main',
ADD COLUMN IF NOT EXISTS parent_account TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aktif';

-- 2. Tambahkan kolom tenant_id ke label_process_history
ALTER TABLE label_process_history
ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- 3. Update existing data
-- Untuk data lama di auth_users, role='main'.
-- Untuk data lama di label_process_history, anggap tenant_id adalah 'jgilbeth92@gmail.com' sesuai kesepakatan.
UPDATE label_process_history 
SET tenant_id = 'jgilbeth92@gmail.com' 
WHERE tenant_id IS NULL;
