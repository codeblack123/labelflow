import asyncio, json
from main import supabase_fetch

async def run():
    # Check what matched_awbs contains vs what processed_items order_id contains
    history = await supabase_fetch('GET', 'label_process_history?select=id,matched_awbs,excel_filename&limit=3&order=created_at.desc')
    print('=== label_process_history (latest 3) ===')
    for h in history:
        print(f"  id={h['id']}")
        print(f"  excel_filename={h.get('excel_filename')}")
        print(f"  matched_awbs (first 3)={h.get('matched_awbs', [])[:3]}")
        
        # Now check if any processed_items exist matching by order_id = matched_awbs
        awbs = h.get('matched_awbs', [])[:3]
        if awbs:
            awb_filter = ','.join([f'"{a}"' for a in awbs])
            import urllib.parse
            items_by_order_id = await supabase_fetch('GET', f'processed_items?order_id=in.({urllib.parse.quote(awb_filter)})&limit=3')
            print(f"  processed_items WHERE order_id IN matched_awbs: {len(items_by_order_id)} rows")
            
            # Also check by awb column 
            items_by_awb = await supabase_fetch('GET', f'processed_items?awb=in.({urllib.parse.quote(awb_filter)})&limit=3')
            print(f"  processed_items WHERE awb IN matched_awbs: {len(items_by_awb)} rows")
        
        # Check by excel_filename
        excel = h.get('excel_filename')
        if excel:
            items_by_excel = await supabase_fetch('GET', f'processed_items?excel_filename=eq.{urllib.parse.quote(excel)}&limit=5&select=order_id,awb')
            print(f"  processed_items WHERE excel_filename matches: {len(items_by_excel)} rows, sample={items_by_excel[:2]}")
        print()

asyncio.run(run())
