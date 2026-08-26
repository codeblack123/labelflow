import asyncio
from main import supabase_fetch

async def test_supabase():
    try:
        # Test the EXACT OR query from the browser
        query = "processed_items?select=*&or=(order_id.ilike.%25JT16793011836%25,awb.ilike.%25JT16793011836%25,excel_filename.ilike.%25JT16793011836%25)&limit=5000"
        print("Testing EXACT OR query...")
        resp = await supabase_fetch('GET', query)
        print("OR GET:", resp)
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    asyncio.run(test_supabase())
