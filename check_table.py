import os
import httpx

# Manual dotenv parser
with open('.env', 'r') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()

url = f"{os.environ.get('VITE_SUPABASE_URL')}/rest/v1/app_settings?select=*"
headers = {
    'apikey': os.environ.get('VITE_SUPABASE_ANON_KEY'),
    'Authorization': f"Bearer {os.environ.get('VITE_SUPABASE_ANON_KEY')}"
}

print(httpx.get(url, headers=headers).text)
