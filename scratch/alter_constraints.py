import httpx
import asyncio

async def main():
    url = "https://lcexnrzqtyrixpuvifxg.supabase.co/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U",
        "Content-Type": "application/json"
    }
    
    # We execute multiple statements
    sql = """
    ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_custom_id_key;
    ALTER TABLE sku_mappings DROP CONSTRAINT IF EXISTS sku_mappings_sku_key;
    ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_custom_id_gudang_id_key UNIQUE (custom_id, gudang_id);
    ALTER TABLE sku_mappings ADD CONSTRAINT sku_mappings_sku_gudang_id_key UNIQUE (sku, gudang_id);
    """
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json={"sql_query": sql}, headers=headers)
        print(resp.status_code, resp.text)

if __name__ == "__main__":
    asyncio.run(main())
