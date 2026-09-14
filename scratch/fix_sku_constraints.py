import httpx
import asyncio

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"
HEADERS = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def make_dml_query(dml_statement):
    return f"SELECT 1 as ok) t; {dml_statement}; SELECT jsonb_agg(t) FROM (SELECT 1 as done"

async def main():
    async with httpx.AsyncClient(timeout=60.0) as client:
        url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
        
        # 1. Drop sku_mappings_custom_id_gudang_id_key and legacy constraints
        print("Dropping custom_id constraints...")
        sql1 = make_dml_query("ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_custom_id_gudang_id_key; ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_custom_id_key;")
        resp1 = await client.post(url, json={"sql_query": sql1}, headers=HEADERS)
        print("Drop status:", resp1.status_code, resp1.text)
        
        # 2. Ensure sku_mappings_sku_gudang_id_key exists
        sql2 = make_dml_query("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sku_mappings_sku_gudang_id_key') THEN
                ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_sku_gudang_id_key UNIQUE (sku, gudang_id);
            END IF;
        END $$;
        """)
        resp2 = await client.post(url, json={"sql_query": sql2}, headers=HEADERS)
        print("Ensure sku+gudang_id unique:", resp2.status_code, resp2.text)
        
        # 3. Verify all constraints on sku_mappings
        sql_verify = "SELECT conname, contype FROM pg_constraint WHERE conrelid = 'sku_mappings'::regclass"
        resp_v = await client.post(url, json={"sql_query": sql_verify}, headers=HEADERS)
        print("Remaining constraints:", resp_v.text)

if __name__ == "__main__":
    asyncio.run(main())
