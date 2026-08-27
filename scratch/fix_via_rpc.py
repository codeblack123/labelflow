import httpx
import asyncio

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"
HEADERS = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

async def main():
    async with httpx.AsyncClient(timeout=60.0) as client:
        url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
        
        # Step 1: Assign all NULL gudang_id rows to Jakarta
        sql1 = "UPDATE sku_mappings SET gudang_id = '184b8a0e-665c-4519-b70b-e5de2287452a' WHERE gudang_id IS NULL"
        resp1 = await client.post(url, json={"sql_query": sql1}, headers=HEADERS)
        print(f"Step 1 (assign NULL to Jakarta): {resp1.status_code} {resp1.text}")
        
        # Step 2: Make gudang_id NOT NULL
        sql2 = "ALTER TABLE sku_mappings ALTER COLUMN gudang_id SET NOT NULL"
        resp2 = await client.post(url, json={"sql_query": sql2}, headers=HEADERS)
        print(f"Step 2 (NOT NULL): {resp2.status_code} {resp2.text}")
        
        # Step 3: Drop old global constraints, add per-gudang ones
        sql3a = "ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_custom_id_key"
        resp3a = await client.post(url, json={"sql_query": sql3a}, headers=HEADERS)
        print(f"Step 3a (drop custom_id_key): {resp3a.status_code} {resp3a.text}")
        
        sql3b = "ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_sku_key"
        resp3b = await client.post(url, json={"sql_query": sql3b}, headers=HEADERS)
        print(f"Step 3b (drop sku_key): {resp3b.status_code} {resp3b.text}")
        
        sql3c = "ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_custom_id_gudang_id_key UNIQUE (custom_id, gudang_id)"
        resp3c = await client.post(url, json={"sql_query": sql3c}, headers=HEADERS)
        print(f"Step 3c (add composite unique custom_id+gudang_id): {resp3c.status_code} {resp3c.text}")
        
        sql3d = "ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_sku_gudang_id_key UNIQUE (sku, gudang_id)"
        resp3d = await client.post(url, json={"sql_query": sql3d}, headers=HEADERS)
        print(f"Step 3d (add composite unique sku+gudang_id): {resp3d.status_code} {resp3d.text}")
        
        # Verify
        sql_verify = "SELECT gudang_id, COUNT(*) as cnt FROM sku_mappings GROUP BY gudang_id"
        resp_v = await client.post(url, json={"sql_query": sql_verify}, headers=HEADERS)
        print(f"\nVerification: {resp_v.status_code} {resp_v.text}")

if __name__ == "__main__":
    asyncio.run(main())
