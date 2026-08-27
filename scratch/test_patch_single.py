import httpx
import asyncio

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"

async def main():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Get one NULL row to work with
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?gudang_id=is.null&select=*&limit=1",
            headers={"apikey": API_KEY, "Authorization": f"Bearer {API_KEY}"}
        )
        rows = resp.json()
        if not rows:
            print("No NULL rows found")
            return
        
        row = rows[0]
        row_id = row['id']
        print(f"Test row: {row}")
        
        # Try PATCH with return=representation to see what happens
        resp2 = await client.patch(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?id=eq.{row_id}",
            json={"gudang_id": "184b8a0e-665c-4519-b70b-e5de2287452a"},
            headers={
                "apikey": API_KEY,
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            }
        )
        print(f"PATCH single row: {resp2.status_code}")
        print(f"Response: {resp2.text}")
        
        # Verify
        resp3 = await client.get(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?id=eq.{row_id}&select=*",
            headers={"apikey": API_KEY, "Authorization": f"Bearer {API_KEY}"}
        )
        print(f"Verify: {resp3.json()}")

if __name__ == "__main__":
    asyncio.run(main())
