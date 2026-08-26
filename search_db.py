import os
from supabase import create_client, Client

url: str = "https://lcexnrzqtyrixpuvifxg.supabase.co"
key: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U"

supabase: Client = create_client(url, key)

print("Checking processed_items...")
response = supabase.table("processed_items").select("*").or_("order_id.eq.260503DGHGGC8K,awb.eq.260503DGHGGC8K").execute()
if response.data:
    print("Found in processed_items:", response.data)
else:
    print("Not found in processed_items.")

print("\nChecking label_process_history...")
response2 = supabase.table("label_process_history").select("*").execute()
# Since we might have matched_awbs, unmatched_excel_awbs, unmatched_pdf_awbs inside JSON arrays
found_history = False
for row in response2.data:
    if ("260503DGHGGC8K" in (row.get("matched_awbs") or [])) or \
       ("260503DGHGGC8K" in (row.get("unmatched_excel_awbs") or [])) or \
       ("260503DGHGGC8K" in (row.get("unmatched_pdf_awbs") or [])):
        print("Found in label_process_history:", row["excel_filename"], row["created_at"])
        found_history = True
        
if not found_history:
    print("Not found in label_process_history.")
