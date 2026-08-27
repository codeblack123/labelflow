import requests
import json
import urllib.parse
with open('.env', 'r') as f:
    for line in f:
        if line.startswith('VITE_SUPABASE_URL='):
            SUPA_URL = line.strip().split('=')[1]
        elif line.startswith('VITE_SUPABASE_ANON_KEY='):
            SUPA_KEY = line.strip().split('=')[1]

url = f"{SUPA_URL}/rest/v1/processed_items?select=*&limit=1"
headers = {
    "apikey": SUPA_KEY,
    "Authorization": f"Bearer {SUPA_KEY}"
}
res = requests.get(url, headers=headers)
print("processed_items columns:", list(res.json()[0].keys()) if res.json() else "empty")

url = f"{SUPA_URL}/rest/v1/label_process_history?select=*&limit=1"
res = requests.get(url, headers=headers)
print("label_process_history columns:", list(res.json()[0].keys()) if res.json() else "empty")
