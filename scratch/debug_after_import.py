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
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
        
        # 1. Total count
        r1 = await client.post(url, json={"sql_query": "SELECT COUNT(*) as total FROM sku_mappings"}, headers=HEADERS)
        print(f"Total rows: {r1.text}")
        
        # 2. Count per gudang_id
        r2 = await client.post(url, json={"sql_query": "SELECT gudang_id, COUNT(*) as cnt FROM sku_mappings GROUP BY gudang_id"}, headers=HEADERS)
        print(f"Per gudang: {r2.text}")
        
        # 3. Sample rows
        r3 = await client.post(url, json={"sql_query": "SELECT custom_id, sku, gudang_id FROM sku_mappings LIMIT 5"}, headers=HEADERS)
        print(f"Sample: {r3.text}")
        
        # 4. Check warehouses
        r4 = await client.post(url, json={"sql_query": "SELECT id, name FROM warehouses ORDER BY name"}, headers=HEADERS)
        print(f"Warehouses: {r4.text}")
        
        # 5. Check NULL gudang_id
        r5 = await client.post(url, json={"sql_query": "SELECT COUNT(*) as null_count FROM sku_mappings WHERE gudang_id IS NULL"}, headers=HEADERS)
        print(f"NULL gudang_id count: {r5.text}")
        
        # 6. Try the exact same query the paginated endpoint would use
        jakarta_id = "184b8a0e-665c-4519-b70b-e5de2287452a"
        r6 = await client.get(
            f"{SUPABASE_URL}/rest/v1/sku_mappings",
            params={
                "select": "custom_id,sku,rak,gudang_id",
                "limit": 5,
                "offset": 0,
                "order": "custom_id.asc",
                "gudang_id": f"eq.{jakarta_id}"
            },
            headers={"apikey": API_KEY, "Authorization": f"Bearer {API_KEY}"}
        )
        print(f"\nREST API fetch (Jakarta): {r6.status_code} {r6.text[:500]}")
        
        # 7. Try without gudang_id filter
        r7 = await client.get(
            f"{SUPABASE_URL}/rest/v1/sku_mappings",
            params={
                "select": "custom_id,sku,rak,gudang_id",
                "limit": 5,
                "offset": 0,
                "order": "custom_id.asc"
            },
            headers={"apikey": API_KEY, "Authorization": f"Bearer {API_KEY}"}
        )
        print(f"REST API fetch (no filter): {r7.status_code} {r7.text[:500]}")

if __name__ == "__main__":
    asyncio.run(main())
