-- Table for Color Rules
CREATE TABLE IF NOT EXISTS sku_formatting_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT NOT NULL,
    color_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(keyword)
);

-- Table for Style Rules
CREATE TABLE IF NOT EXISTS sku_formatting_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT NOT NULL,
    font_size INTEGER DEFAULT 12,
    is_bold BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(keyword)
);

-- Table for Column Settings (Width, Font, etc.)
CREATE TABLE IF NOT EXISTS sku_column_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    column_name TEXT NOT NULL,
    column_width NUMERIC DEFAULT 20,
    font_size INTEGER DEFAULT 12,
    font_name TEXT DEFAULT 'Arial',
    is_bold BOOLEAN DEFAULT FALSE,
    text_align TEXT DEFAULT 'center', -- left, center, right
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(column_name)
);

-- Enable RLS (Optional, but good practice)
ALTER TABLE sku_formatting_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_formatting_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sku_column_settings ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (since we use anon key server-side mostly, or just simple internal tool)
-- Or better, create policy for public read/write if easy access needed
CREATE POLICY "Public enable all" ON sku_formatting_colors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public enable all" ON sku_formatting_styles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public enable all" ON sku_column_settings FOR ALL USING (true) WITH CHECK (true);
