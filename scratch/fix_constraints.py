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
    """Wrap a DML/DDL statement so exec_sql can execute it"""
    return f"SELECT 1 as ok) t; {dml_statement}; SELECT jsonb_agg(t) FROM (SELECT 1 as done"

async def main():
    async with httpx.AsyncClient(timeout=60.0) as client:
        url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
        
        # Step 1: Make gudang_id NOT NULL
        sql1 = make_dml_query("ALTER TABLE sku_mappings ALTER COLUMN gudang_id SET NOT NULL")
        resp1 = await client.post(url, json={"sql_query": sql1}, headers=HEADERS)
        print(f"Step 1 (NOT NULL): {resp1.status_code} {resp1.text}")
        
        # Step 2: Drop old global unique constraints
        sql2a = make_dml_query("ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_custom_id_key")
        resp2a = await client.post(url, json={"sql_query": sql2a}, headers=HEADERS)
        print(f"Step 2a (drop custom_id_key): {resp2a.status_code} {resp2a.text}")
        
        sql2b = make_dml_query("ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_sku_key")
        resp2b = await client.post(url, json={"sql_query": sql2b}, headers=HEADERS)
        print(f"Step 2b (drop sku_key): {resp2b.status_code} {resp2b.text}")
        
        # Step 3: Add composite unique constraints (per gudang)
        # First check if they already exist
        sql3a = make_dml_query("ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_custom_id_gudang_id_key UNIQUE (custom_id, gudang_id)")
        resp3a = await client.post(url, json={"sql_query": sql3a}, headers=HEADERS)
        print(f"Step 3a (add custom_id+gudang_id unique): {resp3a.status_code} {resp3a.text}")
        
        sql3b = make_dml_query("ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_sku_gudang_id_key UNIQUE (sku, gudang_id)")
        resp3b = await client.post(url, json={"sql_query": sql3b}, headers=HEADERS)
        print(f"Step 3b (add sku+gudang_id unique): {resp3b.status_code} {resp3b.text}")
        
        # Verify constraints
        sql_verify = "SELECT conname, contype FROM pg_constraint WHERE conrelid = 'sku_mappings'::regclass"
        resp_v = await client.post(url, json={"sql_query": sql_verify}, headers=HEADERS)
        print(f"\nConstraints after fix: {resp_v.text}")
        
        # Verify data
        sql_data = "SELECT gudang_id, COUNT(*) as cnt FROM sku_mappings GROUP BY gudang_id"
        resp_d = await client.post(url, json={"sql_query": sql_data}, headers=HEADERS)
        print(f"Data counts: {resp_d.text}")

if __name__ == "__main__":
    asyncio.run(main())
