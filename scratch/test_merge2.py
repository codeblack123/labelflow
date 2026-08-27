import httpx
import asyncio

async def main():
    url = "https://lcexnrzqtyrixpuvifxg.supabase.co/rest/v1/sku_mappings"
    headers = {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    # Use real UUIDs for gudang_id
    jakarta_uuid = "184b8a0e-665c-4519-b70b-e5de2287452a"
    surabaya_uuid = "284b8a0e-665c-4519-b70b-e5de2287452a" # just another valid uuid
    
    data = [{
        "custom_id": "test_constraint_id_merge",
        "sku": "test_constraint_sku_merge",
        "gudang_id": jakarta_uuid
    }]
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=data, headers=headers)
        print("Insert 1:", resp.status_code, resp.text)
        
        headers_merge = headers.copy()
        headers_merge["Prefer"] = "resolution=merge-duplicates,return=representation"
        
        data2 = [{
            "custom_id": "test_constraint_id_merge",
            "sku": "test_constraint_sku_merge",
            "gudang_id": surabaya_uuid
        }]
        resp2 = await client.post(url, json=data2, headers=headers_merge)
        print("Upsert:", resp2.status_code, resp2.text)
        
        # Clean up
        await client.delete(url + "?custom_id=eq.test_constraint_id_merge", headers={"apikey": headers["apikey"], "Authorization": headers["Authorization"]})

if __name__ == "__main__":
    asyncio.run(main())
