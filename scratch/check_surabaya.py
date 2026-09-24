import asyncio, httpx

SUPABASE_URL = 'https://lcexnrzqtyrixpuvifxg.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U'
HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

async def check():
    async with httpx.AsyncClient() as client:
        # 1. Warehouses
        res_w = await client.get(f'{SUPABASE_URL}/rest/v1/warehouses?select=*', headers=HEADERS)
        warehouses = res_w.json()
        print('=== WAREHOUSES ===')
        for w in warehouses:
            print(w)
            
        # 2. Staff accounts
        res_staff = await client.get(f'{SUPABASE_URL}/rest/v1/staff_accounts?select=*', headers=HEADERS)
        print('=== STAFF ACCOUNTS ===')
        staff_data = res_staff.json()
        if isinstance(staff_data, list):
            for s in staff_data:
                print(f"Username: {s.get('username')}, Name: {s.get('name')}, Role: {s.get('role')}, Assigned: {s.get('assigned_warehouses')}")
        else:
            print('Staff data:', staff_data)
            
        # 3. Check SKU count per warehouse
        print('=== SKU MAPPINGS COUNT ===')
        for w in warehouses:
            wid = w['id']
            res_cnt = await client.get(f'{SUPABASE_URL}/rest/v1/sku_mappings?gudang_id=eq.{wid}&select=id', headers={**HEADERS, 'Prefer': 'count=exact'})
            count = res_cnt.headers.get('content-range', 'unknown')
            print(f"Warehouse {w['name']} ({wid}): count = {count}")
            
        # 4. Check specific SKUs in images
        test_skus = ['BINDERNOTE-A5-MHPT-M516/PURPLE', 'BOOK-NB-663/RED', 'CLIP-155/1BOX/12PCS', 'CLIP-NO.5']
        print('=== CHECK SPECIFIC SKUS ===')
        for sku in test_skus:
            res_sku = await client.get(f'{SUPABASE_URL}/rest/v1/sku_mappings?sku=ilike.{sku}&select=*', headers=HEADERS)
            print(f"SKU '{sku}': {res_sku.json()}")

asyncio.run(check())
