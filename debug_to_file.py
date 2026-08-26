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
        try:
            r = await c.get(f"{SUPABASE_URL}/rest/v1/{t}", headers=HEADERS, params={"limit": 1})
            return f"TABLE: {t:25} | STATUS: {r.status_code} | ROWS: {len(r.json()) if r.status_code==200 else 'ERR ('+r.text+')'}"
        except Exception as e:
            return f"TABLE: {t:25} | EXCEPTION: {e}"

async def main():
    ts = ["sku_mappings", "sku_categories", "sku_category_members", "sku_priority_bottom", "sku_formatting_colors", "sku_formatting_styles", "sku_column_settings"]
    results = []
    for t in ts: results.append(await check(t))
    with open("debug_results.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(results))

if __name__ == "__main__": asyncio.run(main())
