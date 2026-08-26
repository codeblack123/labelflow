-- ============================================
-- RPC: get_table_sizes()
-- Mengembalikan daftar tabel public beserta
-- estimasi jumlah row dan ukuran disk.
-- ============================================

CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE (
    table_name TEXT,
    estimated_rows BIGINT,
    total_size_bytes BIGINT,
    total_size_pretty TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.relname::TEXT AS table_name,
        c.reltuples::BIGINT AS estimated_rows,
        pg_total_relation_size(c.oid)::BIGINT AS total_size_bytes,
        pg_size_pretty(pg_total_relation_size(c.oid))::TEXT AS total_size_pretty
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'  -- only regular tables
    ORDER BY pg_total_relation_size(c.oid) DESC;
END;
$$;
