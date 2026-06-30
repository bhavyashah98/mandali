const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function probe() {
    // Probe blocked_users columns
    const blockedCols = ['id', 'blocker_id', 'blocked_id', 'created_at'];
    for (const col of blockedCols) {
        const { error } = await supabase.from('blocked_users').select(col).limit(1);
        console.log(`blocked_users.${col} exists:`, !error, error ? error.message : '');
    }

    // Probe reports columns
    const reportsCols = ['id', 'reporter_id', 'content_id', 'group_id', 'content_type', 'reason', 'created_at', 'status', 'reviewed_at', 'content_owner_id', 'additional_notes'];
    for (const col of reportsCols) {
        const { error } = await supabase.from('reports').select(col).limit(1);
        console.log(`reports.${col} exists:`, !error, error ? error.message : '');
    }

    // Probe users columns
    const usersCols = ['id', 'phone', 'name', 'avatar_url', 'birthday', 'status', 'terms_accepted', 'accepted_at', 'terms_version', 'is_admin'];
    for (const col of usersCols) {
        const { error } = await supabase.from('users').select(col).limit(1);
        console.log(`users.${col} exists:`, !error, error ? error.message : '');
    }
}

probe();
