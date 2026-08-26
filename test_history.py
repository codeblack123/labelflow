import asyncio
from main import supabase_fetch
import time

async def test_supabase():
    try:
        # Test fetching 100 history rows
        query = "label_process_history?select=id&limit=100"
        print("Testing history fetch...")
        start = time.time()
        resp = await supabase_fetch('GET', query)
        end = time.time()
        print("Fetch took", end - start, "seconds")
        print("Result:", len(resp), "items")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    asyncio.run(test_supabase())
