import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mtledwhhrpggegdlpzbs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10bGVkd2hocnBnZ2VnZGxwemJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MjAyMjIsImV4cCI6MjA4NDM5NjIyMn0.Z9sS5eaVrlIeCD-csH-MbArXaIsl0uoudOrDfbmmHRg';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
