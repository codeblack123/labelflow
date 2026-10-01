import asyncio, httpx

SUPABASE_URL = 'https://lcexnrzqtyrixpuvifxg.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U'
HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json'
}

sql = """
ALTER TABLE IF EXISTS system_updates 
ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'all';

ALTER TABLE IF EXISTS system_updates 
ADD COLUMN IF NOT EXISTS target_gudang_ids TEXT[] DEFAULT NULL;

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'system_updates'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE system_updates;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

NOTIFY pgrst, 'reload schema';
"""

async def run_migration():
    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            f'{SUPABASE_URL}/rest/v1/rpc/exec_sql',
            json={'sql_query': sql},
            headers=HEADERS
        )
        print('Migration result:', res.status_code, res.text)
        
        # Verify columns exist
        verify_sql = """
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'system_updates'
        ORDER BY ordinal_position;
        """
        v_res = await client.post(
            f'{SUPABASE_URL}/rest/v1/rpc/exec_sql',
            json={'sql_query': verify_sql},
            headers=HEADERS
        )
        print('Columns in system_updates:', v_res.json())

asyncio.run(run_migration())
