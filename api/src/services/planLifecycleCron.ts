import cron from 'node-cron';
import { supabase } from '../lib/supabase';

export async function runPlanLifecycleCheck(now = new Date()) {
    const nowIso = now.toISOString();
    console.log(`[PlanLifecycleCron] Checking plan lifecycle at ${nowIso}`);

    const { data: activatedPlans, error: activateError } = await supabase
        .from('plans')
        .update({ status: 'live' })
        .eq('status', 'upcoming')
        .lte('starts_at', nowIso)
        .gt('ends_at', nowIso)
        .select('id, group_id, activity_label, starts_at');

    if (activateError) {
        console.error('[PlanLifecycleCron] Failed to activate due plans:', activateError);
        throw activateError;
    }

    if (activatedPlans?.length) {
        console.log(`[PlanLifecycleCron] Moved ${activatedPlans.length} plan(s) to live.`);
    }

    const { data: completedPlans, error: completeError } = await supabase
        .from('plans')
        .update({ status: 'past' })
        .in('status', ['upcoming', 'live'])
        .lte('ends_at', nowIso)
        .select('id, group_id, activity_label, ends_at');

    if (completeError) {
        console.error('[PlanLifecycleCron] Failed to complete ended plans:', completeError);
        throw completeError;
    }

    if (completedPlans?.length) {
        console.log(`[PlanLifecycleCron] Moved ${completedPlans.length} ended plan(s) to past.`);
    }

    return {
        activated: activatedPlans?.length ?? 0,
        completed: completedPlans?.length ?? 0,
    };
}

export function initPlanLifecycleCron() {
    runPlanLifecycleCheck().catch((err) => {
        console.error('[PlanLifecycleCron] Initial lifecycle check failed:', err);
    });

    cron.schedule(
        '0,15,30,45 * * * *',
        async () => {
            try {
                await runPlanLifecycleCheck();
            } catch (err) {
                console.error('[PlanLifecycleCron] Fatal error during cron execution:', err);
            }
        },
        {
            timezone: process.env.PLAN_CRON_TIMEZONE || 'Asia/Kolkata',
        }
    );

    console.log('[PlanLifecycleCron] Scheduled: every 15 minutes at :00, :15, :30, :45');
}
