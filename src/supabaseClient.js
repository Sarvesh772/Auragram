import { createClient } from '@supabase/supabase-js';

// Supabase Dashboard -> Project Settings -> API se ye milenge
const supabaseUrl = 'https://gpebgfjgoeujomrqxhir.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZWJnZmpnb2V1am9tcnF4aGlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzY0NjYsImV4cCI6MjEwMDA1MjQ2Nn0.Yp4XUjBMkkf36tjs2ahQFxaJJZ8Y0d0E9bzgLSRE-DQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);