
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbwkidtrnandmlrqqlrl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpid2tpZHRybmFuZG1scnFxbHJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNzYwNjIsImV4cCI6MjA4NTk1MjA2Mn0.xMztoBkT7wfw5QuYfeaH_5SrDAPe2hAf8JXIqVjnZ_M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
