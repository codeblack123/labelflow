-- ==============================================================================
-- FIX SUPABASE SCHEMA PERMISSIONS & ROW LEVEL SECURITY (RLS)
-- Jalankan query ini di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lcexnrzqtyrixpuvifxg/sql/new
-- ==============================================================================

-- 1. BERIKAN HAK AKSES SCHEMA PUBLIC KE ANON & AUTHENTICATED
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 2. OTOMATISKAN HAK AKSES UNTUK TABEL / FUNGSI BARU DI MASA DEPAN
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 3. PASTIKAN STRUKTUR TABEL auth_users TERSEDIA
CREATE TABLE IF NOT EXISTS public.auth_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'main',
    parent_account TEXT,
    department TEXT,
    status TEXT DEFAULT 'Aktif',
    theme TEXT,
    assigned_warehouses UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Pastikan kolom pelengkap ada
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'main';
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS parent_account TEXT;
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aktif';
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS theme TEXT;
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS assigned_warehouses UUID[] DEFAULT '{}';
ALTER TABLE public.auth_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 4. NONAKTIFKAN RLS AGAR TIDAK MEMBLOKIR AKSES DARI APLIKASI
ALTER TABLE IF EXISTS public.auth_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sku_mappings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sku_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sku_category_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sku_priority_bottom DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sku_formatting_colors DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sku_formatting_styles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sku_column_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.label_process_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.processed_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.app_pins DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_updates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.toolkit_locks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.warehouses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.global_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.menu_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.toolkit_features DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.scanned_items DISABLE ROW LEVEL SECURITY;

-- 5. TAMBAHKAN / PERBARUI AKUN CONTOH
-- Akun: ainul@labelflow.com
INSERT INTO public.auth_users (username, password, full_name, role, status)
VALUES ('ainul@labelflow.com', '123456', 'Ainul', 'admin', 'Aktif')
ON CONFLICT (username) 
DO UPDATE SET 
    password = EXCLUDED.password,
    status = 'Aktif',
    role = 'admin';

-- Akun: ainul (versi tanpa domain)
INSERT INTO public.auth_users (username, password, full_name, role, status)
VALUES ('ainul', '123456', 'Ainul', 'admin', 'Aktif')
ON CONFLICT (username) 
DO UPDATE SET 
    password = EXCLUDED.password,
    status = 'Aktif',
    role = 'admin';

-- Akun: jgilbeth92@gmail.com
INSERT INTO public.auth_users (username, password, full_name, role, status)
VALUES ('jgilbeth92@gmail.com', '123456', 'Admin Utama', 'admin', 'Aktif')
ON CONFLICT (username) 
DO UPDATE SET 
    password = EXCLUDED.password,
    status = 'Aktif',
    role = 'admin';
