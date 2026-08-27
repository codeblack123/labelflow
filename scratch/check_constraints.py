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
    
    # Try inserting a duplicate to see which constraint is violated
    # Let's insert a random UUID as id
    data = [{
        "custom_id": "test_constraint_id_123",
        "sku": "test_constraint_sku_123",
        "gudang_id": "184b8a0e-665c-4519-b70b-e5de2287452a"
    }]
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=data, headers=headers)
        print("Insert 1:", resp.status_code, resp.text)
        
        # Try inserting same custom_id, different sku
        data2 = [{
            "custom_id": "test_constraint_id_123",
            "sku": "test_constraint_sku_456",
            "gudang_id": "184b8a0e-665c-4519-b70b-e5de2287452a"
        }]
        resp2 = await client.post(url, json=data2, headers=headers)
        print("Insert 2 (same custom_id):", resp2.status_code, resp2.text)
        
        # Try inserting different custom_id, same sku
        data3 = [{
            "custom_id": "test_constraint_id_456",
            "sku": "test_constraint_sku_123",
            "gudang_id": "184b8a0e-665c-4519-b70b-e5de2287452a"
        }]
        resp3 = await client.post(url, json=data3, headers=headers)
        print("Insert 3 (same sku):", resp3.status_code, resp3.text)
        
        # Clean up
        await client.delete(url + "?custom_id=like.test_constraint_id_%", headers={"apikey": headers["apikey"], "Authorization": headers["Authorization"]})

if __name__ == "__main__":
    asyncio.run(main())
