import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { sendGroupPushNotification } from '../lib/push';

const PLAN_NOTIFICATION_TIMEZONE = process.env.PLAN_CRON_TIMEZONE || 'Asia/Kolkata';

const LIVE_NOTIFICATION_VARIANTS = [
    {
        title: 'Your Mandali plan is live',
        body: (activity: string) => `${activity} is happening now. Open the plan and keep everyone in sync.`,
    },
    {
        title: 'The plan just went live',
        body: (activity: string) => `${activity} has started. Time to jump in with your Mandali.`,
    },
    {
        title: 'It is go time',
        body: (activity: string) => `${activity} is live now. Check the plan hub for details and updates.`,
    },
];

const REMINDER_NOTIFICATION_VARIANTS = [
    {
        title: 'Plan reminder',
        body: (activity: string, when: string) => `${activity} is coming up ${when}. RSVP or check the details when you have a minute.`,
    },
    {
        title: 'Your Mandali has plans',
        body: (activity: string, when: string) => `${activity} is still on for ${when}. A tiny nudge from your calendar corner.`,
    },
    {
        title: 'Do not miss this plan',
        body: (activity: string, when: string) => `${activity} is scheduled ${when}. Open Mandali to see who is in.`,
    },
];

const SCHEDULED_NOTIFICATION_VARIANTS = [
    {
        title: 'New plan on Mandali',
        body: (activity: string, when: string) => `${activity} is planned for ${when}. Open it up and let the group know if you are in.`,
    },
    {
        title: 'A plan just landed',
        body: (activity: string, when: string) => `${activity} is now on the calendar for ${when}.`,
    },
    {
        title: 'Your Mandali has a new plan',
        body: (activity: string, when: string) => `${activity} is scheduled for ${when}. Check the details when you can.`,
    },
];

function hashString(value: string): number {
    return value.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0);
}

function pickVariant<T>(variants: T[], seed: string, now = new Date()): T {
    const daySeed = Math.floor(now.getTime() / (24 * 60 * 60 * 1000));
    return variants[(hashString(seed) + daySeed) % variants.length];
}

function formatPlanWhen(startsAt: string): string {
    const starts = new Date(startsAt);
    const date = starts.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const time = starts.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    return `${date} at ${time}`;
}

function planNotificationData(plan: { id: string; group_id: string }) {
    return {
        type: 'plan',
        planId: plan.id,
        groupId: plan.group_id,
        url: `mandali://plans/${plan.id}`,
    };
}

async function sendPlanLiveNotification(plan: any, now = new Date()) {
    const variant = pickVariant(LIVE_NOTIFICATION_VARIANTS, plan.id, now);
    await sendGroupPushNotification(
        plan.group_id,
        plan.created_by,
        variant.title,
        variant.body(plan.activity_label || 'Your plan'),
        planNotificationData(plan)
    );
}

async function sendPlanReminderNotification(plan: any, now = new Date()) {
    const variant = pickVariant(REMINDER_NOTIFICATION_VARIANTS, plan.id, now);
    await sendGroupPushNotification(
        plan.group_id,
        plan.created_by,
        variant.title,
        variant.body(plan.activity_label || 'Your plan', formatPlanWhen(plan.starts_at)),
        planNotificationData(plan)
    );
}

export async function sendPlanScheduledNotification(plan: any, now = new Date()) {
    const variant = pickVariant(SCHEDULED_NOTIFICATION_VARIANTS, plan.id, now);
    await sendGroupPushNotification(
        plan.group_id,
        plan.created_by,
        variant.title,
        variant.body(plan.activity_label || 'A new plan', formatPlanWhen(plan.starts_at)),
        planNotificationData(plan)
    );
}

export async function runPlanLifecycleCheck(now = new Date()) {
    const nowIso = now.toISOString();
    console.log(`[PlanLifecycleCron] Checking plan lifecycle at ${nowIso}`);

    const { data: activatedPlans, error: activateError } = await supabase
        .from('plans')
        .update({ status: 'live' })
        .eq('status', 'upcoming')
        .lte('starts_at', nowIso)
        .gt('ends_at', nowIso)
        .select('id, group_id, created_by, activity_label, starts_at');

    if (activateError) {
        console.error('[PlanLifecycleCron] Failed to activate due plans:', activateError);
        throw activateError;
    }

    if (activatedPlans?.length) {
        console.log(`[PlanLifecycleCron] Moved ${activatedPlans.length} plan(s) to live.`);
        await Promise.all(activatedPlans.map((plan) => sendPlanLiveNotification(plan, now)));
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

export async function runPlanReminderCheck(now = new Date()) {
    const nowIso = now.toISOString();
    console.log(`[PlanLifecycleCron] Sending daily plan reminders at ${nowIso}`);

    const { data: upcomingPlans, error } = await supabase
        .from('plans')
        .select('id, group_id, created_by, activity_label, starts_at')
        .eq('status', 'upcoming')
        .gt('starts_at', nowIso)
        .order('starts_at', { ascending: true });

    if (error) {
        console.error('[PlanLifecycleCron] Failed to load upcoming plans for reminders:', error);
        throw error;
    }

    if (!upcomingPlans?.length) {
        console.log('[PlanLifecycleCron] No upcoming plans need reminders today.');
        return { reminded: 0 };
    }

    await Promise.all(upcomingPlans.map((plan) => sendPlanReminderNotification(plan, now)));
    console.log(`[PlanLifecycleCron] Sent reminder notification(s) for ${upcomingPlans.length} upcoming plan(s).`);
    return { reminded: upcomingPlans.length };
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
            timezone: PLAN_NOTIFICATION_TIMEZONE,
        }
    );

    cron.schedule(
        process.env.PLAN_REMINDER_CRON || '0 9 * * *',
        async () => {
            try {
                await runPlanReminderCheck();
            } catch (err) {
                console.error('[PlanLifecycleCron] Fatal error during reminder cron execution:', err);
            }
        },
        {
            timezone: PLAN_NOTIFICATION_TIMEZONE,
        }
    );

    console.log('[PlanLifecycleCron] Scheduled: every 15 minutes at :00, :15, :30, :45');
    console.log('[PlanLifecycleCron] Daily reminders scheduled at 09:00');
}
