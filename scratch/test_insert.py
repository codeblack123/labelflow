import httpx
import asyncio

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"
HEADERS = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

JAKARTA_ID = "184b8a0e-665c-4519-b70b-e5de2287452a"

async def main():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Test 1: Simple insert
        data = [{
            "custom_id": "TEST-001",
            "sku": "TEST-SKU-001",
            "rak": "A1",
            "gudang_id": JAKARTA_ID
        }]
        
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/sku_mappings",
            json=data,
            headers={**HEADERS, "Prefer": "return=representation"}
        )
        print(f"Simple insert: {resp.status_code} {resp.text}")
        
        # Test 2: Insert with on_conflict (same as import endpoint uses)
        data2 = [{
            "custom_id": "TEST-002",
            "sku": "TEST-SKU-002",
            "rak": "A2",
            "gudang_id": JAKARTA_ID
        }]
        
        resp2 = await client.post(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?on_conflict=custom_id,gudang_id",
            json=data2,
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"}
        )
        print(f"Upsert with on_conflict: {resp2.status_code} {resp2.text}")
        
        # Test 3: Insert with duplicate custom_id but different gudang
        surabaya_id = "723699d7-a826-4cde-b3d6-98189bedf77d"
        data3 = [{
            "custom_id": "TEST-001",
            "sku": "TEST-SKU-001",
            "rak": "A1",
            "gudang_id": surabaya_id
        }]
        
        resp3 = await client.post(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?on_conflict=custom_id,gudang_id",
            json=data3,
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=representation"}
        )
        print(f"Same ID different gudang: {resp3.status_code} {resp3.text}")
        
        # Test 4: Check what's there now
        url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
        r = await client.post(url, json={"sql_query": "SELECT custom_id, sku, gudang_id FROM sku_mappings"}, headers=HEADERS)
        print(f"\nAll rows now: {r.text}")
        
        # Cleanup
        await client.delete(
            f"{SUPABASE_URL}/rest/v1/sku_mappings?custom_id=like.TEST*",
            headers={**HEADERS, "Prefer": "return=minimal"}
        )
        print("Cleaned up test rows")

if __name__ == "__main__":
    asyncio.run(main())
