-- SQL script to add skip_pin_menus column to menu_settings table
ALTER TABLE public.menu_settings 
ADD COLUMN IF NOT EXISTS skip_pin_menus JSONB DEFAULT '[]'::jsonb;

-- Also create app_settings row if not exists as fallback
INSERT INTO public.app_settings (key, value, description)
VALUES ('skip_pin_menus', '[]', 'Daftar menu yang di-skip modal PIN')
ON CONFLICT (key) DO NOTHING;
