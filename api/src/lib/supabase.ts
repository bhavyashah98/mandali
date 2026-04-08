import { createClient } from '@supabase/supabase-js';

// Service role key bypasses RLS — use only in backend
export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);