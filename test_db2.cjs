const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const SUPA_URL = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_URL')).split('=')[1].trim();
const SUPA_KEY = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_ANON_KEY')).split('=')[1].trim();

const headers = {
    "apikey": SUPA_KEY,
    "Authorization": `Bearer ${SUPA_KEY}`
};

fetch(`${SUPA_URL}/rest/v1/scanned_items?select=*&limit=1`, { headers })
    .then(r => r.json())
    .then(data => console.log("scanned_items columns:", data.length ? Object.keys(data[0]) : "empty"));
