import httpx
import asyncio
import json

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
        
        # Check pg_constraint
        sql_con = "SELECT conname, contype, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'sku_mappings'::regclass"
        resp = await client.post(url, json={"sql_query": sql_con}, headers=HEADERS)
        print("pg_constraint:", resp.text)
        
        # Check pg_indexes
        sql_idx = "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'sku_mappings'"
        resp_idx = await client.post(url, json={"sql_query": sql_idx}, headers=HEADERS)
        print("pg_indexes:", resp_idx.text)

if __name__ == "__main__":
    asyncio.run(main())
