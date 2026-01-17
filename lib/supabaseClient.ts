import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://chwxexdwzxpolmhmbfco.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNod3hleGR3enhwb2xtaG1iZmNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTk3MjQsImV4cCI6MjA4MzkzNTcyNH0.XF784Lsg8uojkreMVWcROd3V3G8Vvv3ockBL4peBcrE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);