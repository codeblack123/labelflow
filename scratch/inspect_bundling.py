import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from main import supabase_fetch

async def main():
    rows = await supabase_fetch('GET', 'sku_bundling?select=sku_bundle,sku_satuan&limit=40')
    if rows:
        for r in rows:
            print(f"{r.get('sku_bundle')}  -->  {r.get('sku_satuan')}")
    else:
        print("No rows found")

if __name__ == '__main__':
    asyncio.run(main())
