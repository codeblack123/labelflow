import asyncio
from main import supabase_fetch
import time

async def test_supabase():
    try:
        # Test the IN query
        query = "processed_items?select=*&or=(order_id.in.(JT16793011836),awb.in.(JT16793011836))&limit=5000"
        print("Testing IN query...")
        start = time.time()
        resp = await supabase_fetch('GET', query)
        end = time.time()
        print("IN GET took", end - start, "seconds")
        print("Result:", len(resp), "items")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    asyncio.run(test_supabase())
