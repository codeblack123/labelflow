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
        
        # exec_sql wraps query in: SELECT jsonb_agg(t) FROM ({query}) t
        # So we need a query that BOTH updates and returns results
        # PostgreSQL supports UPDATE ... RETURNING in a CTE!
        
        # Step 1: Assign NULL gudang_id to Jakarta using writable CTE
        sql1 = """
WITH updated AS (
    UPDATE sku_mappings 
    SET gudang_id = '184b8a0e-665c-4519-b70b-e5de2287452a' 
    WHERE gudang_id IS NULL 
    RETURNING id
) 
SELECT COUNT(*) as updated_count FROM updated
"""
        resp1 = await client.post(url, json={"sql_query": sql1}, headers=HEADERS)
        print(f"Step 1 (assign NULL to Jakarta): {resp1.status_code} {resp1.text}")
        
        # Verify
        sql_verify = "SELECT gudang_id, COUNT(*) as cnt FROM sku_mappings GROUP BY gudang_id"
        resp_v = await client.post(url, json={"sql_query": sql_verify}, headers=HEADERS)
        print(f"Verification: {resp_v.text}")

if __name__ == "__main__":
    asyncio.run(main())
