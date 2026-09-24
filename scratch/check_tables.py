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
        r = await client.post(
            f'{SUPABASE_URL}/rest/v1/rpc/exec_sql',
            json={'sql_query': "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"},
            headers=HEADERS
        )
        print('Tables:', [t['table_name'] for t in r.json()])

asyncio.run(check())
