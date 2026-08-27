import httpx
import asyncio

async def main():
    url = "https://lcexnrzqtyrixpuvifxg.supabase.co/rest/v1/rpc/exec_sql"
    headers = {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U",
        "Content-Type": "application/json"
    }
    
    # Check current constraints on sku_mappings
    sql = """
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'sku_mappings'::regclass;
    """
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json={"sql_query": sql}, headers=headers)
        print(resp.status_code, resp.text)

if __name__ == "__main__":
    asyncio.run(main())
