
import httpx

SUPABASE_URL = "https://lcexnrzqtyrixpuvifxg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

def test_table(table_name):
    url = f"{SUPABASE_URL}/rest/v1/{table_name}"
    params = {"select": "*", "limit": 1}
    try:
        with httpx.Client() as client:
            response = client.get(url, headers=HEADERS, params=params, timeout=10)
            print(f"Table: {table_name} -> Status: {response.status_code}")
            if response.status_code >= 400:
                print(f"Error Detail: {response.text}")
    except Exception as e:
        print(f"Table: {table_name} -> Error: {e}")

tables = [
    "sku_bulky",
    "sku_formatting_colors",
    "sku_formatting_styles",
    "sku_column_settings",
    "toolkit_feature_locks",
    "auth_users",
    "global_notifications"
]

for table in tables:
    test_table(table)
