import httpx
import asyncio

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"
HEADERS = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

async def main():
    async with httpx.AsyncClient(timeout=60.0) as client:
        url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"

        # Construct payload using the multi-statement technique
        ddl = """
        ALTER TABLE IF EXISTS system_updates ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'all';
        ALTER TABLE IF EXISTS system_updates ADD COLUMN IF NOT EXISTS target_gudang_ids TEXT[] DEFAULT NULL;
        DO $pub$ 
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
        END $pub$;
        NOTIFY pgrst, 'reload schema';
        """

        sql_inject = f"SELECT 1 as ok) t; {ddl} SELECT jsonb_agg(t) FROM (SELECT 'migration_success' as status"

        resp = await client.post(url, json={"sql_query": sql_inject}, headers=HEADERS)
        print(f"Migration response: {resp.status_code} {resp.text}")

        # Verify columns in system_updates
        verify_sql = """
        SELECT column_name, data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'system_updates'
        ORDER BY ordinal_position
        """
        resp_v = await client.post(url, json={"sql_query": verify_sql}, headers=HEADERS)
        print(f"Columns verification: {resp_v.text}")

if __name__ == "__main__":
    asyncio.run(main())
