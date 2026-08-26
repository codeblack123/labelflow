import { createClient } from '@supabase/supabase-js';

// Dedicated Supabase client for cancelled_orders table ONLY
// This is used exclusively by ToolkitAwbFilter for "Data Patokan (Hapus)" feature
const cancelledOrdersUrl = 'https://lxhwyrzxgqvosecnhfli.supabase.co';
const cancelledOrdersAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4aHd5cnp4Z3F2b3NlY25oZmxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NzQ3MjEsImV4cCI6MjA4NTE1MDcyMX0.32gBAnMHN9R4eWl-Tu2NxivrM7c7Kqctk9XEvdpKf94';

export const supabaseCancelledOrders = createClient(cancelledOrdersUrl, cancelledOrdersAnonKey);
