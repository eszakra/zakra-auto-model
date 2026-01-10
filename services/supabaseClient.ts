import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obtuhkszoudwypklhvyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9idHVoa3N6b3Vkd3lwa2xodnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTU3MDYsImV4cCI6MjA4MzU5MTcwNn0.CoaXMkWPfH5vXXuFsV9WxpoLYOkFJfLCEbOchMBIuzA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);