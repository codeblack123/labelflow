import asyncio
from main import supabase_fetch

async def test_supabase():
    try:
        # First test a simple query
        resp = await supabase_fetch('GET', 'processed_items?select=order_id,awb&limit=1')
        print("Simple GET:", resp)
        
        # Test the OR query
        query = "processed_items?select=*&or=(order_id.ilike.%25JT1%25,awb.ilike.%25JT1%25,excel_filename.ilike.%25JT1%25)&limit=1"
        print("Testing OR query...")
        resp = await supabase_fetch('GET', query)
        print("OR GET:", resp)
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    asyncio.run(test_supabase())
