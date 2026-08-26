import httpx
import asyncio

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

async def check_table(table):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {"select": "count", "limit": 1} # Just to see if it works
    # Actually PostgREST doesn't support select=count like this.
    # Just select * with limit 1
    params = {"select": "*", "limit": 1}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=HEADERS, params=params)
            print(f"Table {table}: Status {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"  Data sample: {data}")
            else:
                print(f"  Error: {response.text}")
        except Exception as e:
            print(f"  Exception: {e}")

async def main():
    tables = [
        "sku_mappings",
        "sku_categories",
        "sku_category_members",
        "sku_priority_bottom",
        "sku_formatting_colors",
        "sku_formatting_styles",
        "sku_column_settings"
    ]
    for t in tables:
        await check_table(t)

if __name__ == "__main__":
    asyncio.run(main())
