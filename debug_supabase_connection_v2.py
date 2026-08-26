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
    # Use select=* with HEAD to get count in Content-Range
    async with httpx.AsyncClient() as client:
        try:
            # We use a trick: limit 0 with Prefer: count=exact
            h = HEADERS.copy()
            h["Prefer"] = "count=exact"
            response = await client.get(url, headers=h, params={"limit": 0})
            count = 0
            if "Content-Range" in response.headers:
                # Content-Range: */total or 0-0/total
                count = response.headers["Content-Range"].split("/")[-1]
            
            # Also try to fetch 1 row to be sure it's valid
            res_data = await client.get(url, headers=HEADERS, params={"limit": 1})
            
            print(f"[{table}] Status: {response.status_code}, Count: {count}, DataStatus: {res_data.status_code}")
            if res_data.status_code == 200:
                data = res_data.json()
                print(f"  Sample: {data[0] if data else 'EMPTY'}")
            else:
                print(f"  Error: {res_data.text}")
        except Exception as e:
            print(f"[{table}] Exception: {e}")

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
