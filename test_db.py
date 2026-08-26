import httpx
import asyncio

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

async def check(table):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{SUPABASE_URL}/rest/v1/{table}?select=count", headers={**HEADERS, "Prefer": "count=exact"})
        count = resp.headers.get("Content-Range", "0-0/0").split("/")[-1]
        print(f"Table {table}: {count} rows")

async def main():
    tables = ["sku_mappings", "processed_items", "label_process_history", "sku_priority_bottom"]
    for t in tables:
        await check(t)

if __name__ == "__main__":
    asyncio.run(main())
