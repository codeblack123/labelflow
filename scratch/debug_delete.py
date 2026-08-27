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
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. List all warehouses
        print("=== WAREHOUSES ===")
        resp = await client.get(f"{SUPABASE_URL}/rest/v1/warehouses?select=*", headers=HEADERS)
        warehouses = resp.json()
        for w in warehouses:
            print(f"  ID: {w['id']}  Name: {w['name']}")
        
        print()
        
        # 2. Count SKU mappings per gudang_id
        print("=== SKU MAPPINGS COUNT PER GUDANG ===")
        resp = await client.get(f"{SUPABASE_URL}/rest/v1/sku_mappings?select=gudang_id", headers=HEADERS)
        all_mappings = resp.json()
        
        # Count by gudang_id
        counts = {}
        for m in all_mappings:
            gid = m.get('gudang_id', 'NULL')
            counts[gid] = counts.get(gid, 0) + 1
        
        for gid, count in counts.items():
            wname = next((w['name'] for w in warehouses if w['id'] == gid), 'UNKNOWN')
            print(f"  Gudang: {wname} ({gid}) -> {count} rows")
        
        print(f"\n  TOTAL: {len(all_mappings)} rows")
        
        # 3. Check if there are rows WITHOUT gudang_id
        print("\n=== ROWS WITHOUT GUDANG_ID ===")
        resp = await client.get(f"{SUPABASE_URL}/rest/v1/sku_mappings?gudang_id=is.null&select=id,custom_id,sku,gudang_id&limit=5", headers=HEADERS)
        null_rows = resp.json()
        if null_rows:
            print(f"  Found {len(null_rows)} rows with NULL gudang_id:")
            for r in null_rows:
                print(f"    {r}")
        else:
            print("  None found")
        
        # 4. Test what the DELETE endpoint actually builds
        print("\n=== SIMULATING DELETE REQUEST ===")
        if warehouses:
            test_gudang = warehouses[0]['id']
            test_url = f"{SUPABASE_URL}/rest/v1/sku_mappings"
            test_params = {
                "custom_id": "neq.________NEVER_MATCH________",
                "gudang_id": f"eq.{test_gudang}"
            }
            print(f"  URL: {test_url}")
            print(f"  Params: {test_params}")
            
            # Build the actual URL that httpx would send
            req = client.build_request("DELETE", test_url, params=test_params, headers=HEADERS)
            print(f"  Full URL httpx builds: {req.url}")

if __name__ == "__main__":
    asyncio.run(main())
