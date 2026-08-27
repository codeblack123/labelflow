import httpx
import asyncio

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"
HEADERS_GET = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}"
}

async def main():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Check NULL rows remaining
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?gudang_id=is.null&select=id&limit=5",
            headers=HEADERS_GET
        )
        null_rows = resp.json()
        print(f"Rows with NULL gudang_id: {len(null_rows)}")
        
        # 2. Count per gudang
        resp2 = await client.get(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?select=gudang_id&limit=10000",
            headers=HEADERS_GET
        )
        all_rows = resp2.json()
        counts = {}
        for r in all_rows:
            gid = r.get('gudang_id', 'NULL')
            counts[gid] = counts.get(gid, 0) + 1
        
        # Get warehouse names
        resp3 = await client.get(f"{SUPABASE_URL}/rest/v1/warehouses?select=*", headers=HEADERS_GET)
        warehouses = resp3.json()
        
        print(f"\nTotal rows: {len(all_rows)}")
        print("Counts per gudang:")
        for gid, count in counts.items():
            wname = next((w['name'] for w in warehouses if w['id'] == gid), 'UNKNOWN/NULL')
            print(f"  {wname} ({gid}): {count} rows")

if __name__ == "__main__":
    asyncio.run(main())
