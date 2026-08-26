import httpx
import asyncio

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

async def check(t):
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{SUPABASE_URL}/rest/v1/{t}", headers=HEADERS, params={"limit": 1})
        print(f"TABLE: {t} | STATUS: {r.status_code} | ROWS: {len(r.json()) if r.status_code==200 else 'ERR'}")

async def main():
    ts = ["sku_mappings", "sku_categories", "sku_category_members", "sku_priority_bottom", "sku_formatting_colors", "sku_formatting_styles", "sku_column_settings"]
    for t in ts: await check(t)

if __name__ == "__main__": asyncio.run(main())
