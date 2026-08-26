import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# load environment variables
env_path = 'c:/Users/jgilb/OneDrive/Dokumen/bolt new/8_shipping-label-customizer/shipping-label-customizer 9 new 23/shipping-label-customizer 9 new 23/.env'
load_dotenv(dotenv_path=env_path)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

print("Testing INSERT into label_process_history...")
try:
    data = {
        'excel_filename': 'TEST_DELETE_ME.xlsx',
        'matched_count': 0,
        'unmatched_excel_count': 0,
        'unmatched_pdf_count': 0,
        'total_pdfs': 0,
        'total_pdfs_pages': 0,
        'processing_type': 'test',
        'username': 'admin'
    }
    result = supabase.table("label_process_history").insert(data).execute()
    print("Insert SUCCESS:", result.data)
except Exception as e:
    print("Insert FAILED:", str(e))

print("Testing SELECT from label_process_history...")
try:
    result = supabase.table("label_process_history").select("*").limit(1).execute()
    print("Select SUCCESS:", result.data)
except Exception as e:
    print("Select FAILED:", str(e))
