import httpx
import asyncio

async def test_endpoint(path):
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(f"http://localhost:8000{path}")
            print(f"GET {path} | STATUS: {r.status_code}")
            if r.status_code == 200:
                print(f"  DATA: {r.json()}")
            else:
                print(f"  ERROR: {r.text}")
        except Exception as e:
            print(f"  EXCEPTION: {e}")

async def main():
    paths = [
        "/settings/sku-mappings-paginated?page=1&limit=10",
        "/settings/grouping-list",
        "/settings/priority-bottom",
        "/settings/formatting/colors",
        "/settings/formatting/styles",
        "/settings/formatting/columns"
    ]
    for p in paths:
        await test_endpoint(p)

if __name__ == "__main__":
    asyncio.run(main())
