import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lcexnrzqtyrixpuvifxg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U';

const supabase = createClient(supabaseUrl, supabaseKey);

async function search() {
  console.log("Searching in processed_items for 260503DGHGGC8K...");
  
  const { data: items, error: itemsError } = await supabase
    .from('processed_items')
    .select('*')
    .or('order_id.eq.260503DGHGGC8K,awb.eq.260503DGHGGC8K');
    
  if (itemsError) console.error("Error:", itemsError);
  console.log("Results in processed_items:", items);
  
  // also check label_process_history using text search
  console.log("\nSearching in label_process_history...");
  const { data: history, error: histError } = await supabase
    .from('label_process_history')
    .select('id, excel_filename, created_at, matched_awbs, unmatched_excel_awbs, unmatched_pdf_awbs')
    .order('created_at', { ascending: false });
    
  if (histError) console.error("Error:", histError);
  
  let found = false;
  if (history) {
    for (const row of history) {
      const allArrays = [
        ...(row.matched_awbs || []),
        ...(row.unmatched_excel_awbs || []),
        ...(row.unmatched_pdf_awbs || [])
      ];
      if (allArrays.includes("260503DGHGGC8K")) {
         console.log("Found in history:", row.excel_filename, row.created_at);
         found = true;
      }
    }
  }
  if (!found) {
    console.log("Not found in label_process_history arrays.");
  }
}

search();
