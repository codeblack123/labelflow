-- Migration script to add tenant_id to scanned_items
ALTER TABLE public.scanned_items 
ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Create an index to improve Dashboard query performance
CREATE INDEX IF NOT EXISTS idx_scanned_items_tenant_id ON public.scanned_items (tenant_id);
