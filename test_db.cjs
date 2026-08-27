const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const SUPA_URL = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_URL')).split('=')[1].trim();
const SUPA_KEY = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_ANON_KEY')).split('=')[1].trim();

const headers = {
    "apikey": SUPA_KEY,
    "Authorization": `Bearer ${SUPA_KEY}`
};

fetch(`${SUPA_URL}/rest/v1/processed_items?select=*&limit=1`, { headers })
    .then(r => r.json())
    .then(data => console.log("processed_items columns:", data.length ? Object.keys(data[0]) : "empty"));

fetch(`${SUPA_URL}/rest/v1/label_process_history?select=*&limit=1`, { headers })
    .then(r => r.json())
    .then(data => console.log("label_process_history columns:", data.length ? Object.keys(data[0]) : "empty"));
