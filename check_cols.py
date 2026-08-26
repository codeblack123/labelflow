import asyncio
from main import supabase_fetch
import json

async def check_columns():
    try:
        resp = await supabase_fetch('GET', 'label_process_history?limit=1')
        if resp and len(resp) > 0:
            print("Columns in label_process_history:")
            print(list(resp[0].keys()))
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    asyncio.run(check_columns())
