import httpx
import asyncio

async def main():
    url = "https://lcexnrzqtyrixpuvifxg.supabase.co/rest/v1/sku_mappings"
    headers = {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
    }
    
    # 1. Insert original
    data = [{
        "custom_id": "test_constraint_id_merge",
        "sku": "test_constraint_sku_merge",
        "gudang_id": "jakarta_id_123"
    }]
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=data, headers={"apikey": headers["apikey"], "Authorization": headers["Authorization"], "Content-Type": "application/json", "Prefer": "return=representation"})
        print("Insert 1:", resp.status_code, resp.text)
        
        # 2. Insert with merge-duplicates, new gudang_id
        data2 = [{
            "custom_id": "test_constraint_id_merge",
            "sku": "test_constraint_sku_merge",
            "gudang_id": "surabaya_id_456"
        }]
        resp2 = await client.post(url, json=data2, headers=headers)
        print("Upsert:", resp2.status_code, resp2.text)
        
        # Clean up
        await client.delete(url + "?custom_id=eq.test_constraint_id_merge", headers={"apikey": headers["apikey"], "Authorization": headers["Authorization"]})

if __name__ == "__main__":
    asyncio.run(main())
