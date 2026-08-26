
import asyncio
import httpx

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

async def test_delete():
    async with httpx.AsyncClient() as client:
        # Try a few different delete patterns
        patterns = [
            "sku_mappings?custom_id=is.not.null",
            "sku_mappings?custom_id=neq.________EMPTY________",
            "sku_mappings?custom_id=gt. ",
            "sku_mappings" # This might fail if unsafe delete is disabled
        ]
        
        for p in patterns:
            print(f"Testing delete on: {p}")
            url = f"{SUPABASE_URL}/rest/v1/{p}"
            try:
                res = await client.delete(url, headers=HEADERS)
                print(f"Status: {res.status_code}")
                print(f"Body: {res.text}")
            except Exception as e:
                print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_delete())
