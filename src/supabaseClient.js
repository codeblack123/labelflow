import { createClient } from '@supabase/supabase-js';

// Supabase configuration for Label Customizer
const supabaseUrl = 'https://lcexnrzqtyrixpuvifxg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjZXhucnpxdHlyaXhwdXZpZnhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTIxNTgsImV4cCI6MjA4NTM2ODE1OH0.HVtoklr7Y--yiYWLgfDA1M2qjR_xt7ihtDZoOR4IP5U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseEnabled = true;
