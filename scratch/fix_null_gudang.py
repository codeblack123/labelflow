import httpx
import asyncio

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"
HEADERS = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Gudang Jakarta ID
JAKARTA_ID = "184b8a0e-665c-4519-b70b-e5de2287452a"

async def main():
    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. Count NULL gudang_id rows
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?gudang_id=is.null&select=id&limit=10000",
            headers={"apikey": API_KEY, "Authorization": f"Bearer {API_KEY}"}
        )
        null_rows = resp.json()
        print(f"Found {len(null_rows)} rows with gudang_id = NULL")
        
        if len(null_rows) == 0:
            print("No rows to fix!")
            return
        
        # 2. Update all NULL gudang_id rows to Jakarta
        print(f"Assigning all NULL rows to Gudang Jakarta ({JAKARTA_ID})...")
        resp = await client.patch(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?gudang_id=is.null",
            json={"gudang_id": JAKARTA_ID},
            headers=HEADERS
        )
        print(f"PATCH response: {resp.status_code} {resp.text}")
        
        if resp.status_code < 300:
            print(f"✓ Successfully assigned {len(null_rows)} rows to Gudang Jakarta!")
        else:
            print(f"✗ Failed: {resp.text}")
        
        # 3. Verify
        resp2 = await client.get(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?gudang_id=is.null&select=id&limit=5",
            headers={"apikey": API_KEY, "Authorization": f"Bearer {API_KEY}"}
        )
        remaining = resp2.json()
        print(f"\nVerification: {len(remaining)} rows still have NULL gudang_id")
        
        # 4. Count per gudang after fix
        resp3 = await client.get(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?select=gudang_id&limit=10000",
            headers={"apikey": API_KEY, "Authorization": f"Bearer {API_KEY}"}
        )
        all_rows = resp3.json()
        counts = {}
        for r in all_rows:
            gid = r.get('gudang_id', 'NULL')
            counts[gid] = counts.get(gid, 0) + 1
        print("\nFinal counts per gudang:")
        for gid, count in counts.items():
            print(f"  {gid}: {count} rows")

if __name__ == "__main__":
    asyncio.run(main())
