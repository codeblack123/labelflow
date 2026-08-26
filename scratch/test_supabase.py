
import asyncio
from main import supabase_fetch

async def test():
    try:
        feature_res = await supabase_fetch("GET", "toolkit_feature_locks")
        print("Result:", feature_res)
    except Exception as e:
        print("Error:", e)

asyncio.run(test())
