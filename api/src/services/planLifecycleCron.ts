import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { sendGroupPushNotification, sendUserPushNotification } from '../lib/push';

const PLAN_NOTIFICATION_TIMEZONE = process.env.PLAN_CRON_TIMEZONE || 'Asia/Kolkata';
const PLAN_REMINDER_INTERVAL_MS = 15 * 60 * 1000;
const PLAN_REMINDER_ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PLAN_REMINDER_FINAL_MIN_MS = 60 * 60 * 1000;
const PLAN_REMINDER_FINAL_MAX_MS = 2 * 60 * 60 * 1000;
const PLAN_INACTIVITY_DAYS = 15;
const sentPlanReminderIds = new Set<string>();
const sentPlanInactivityKeys = new Set<string>();

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

const INACTIVITY_NOTIFICATION_VARIANTS = [
    {
        title: (groupName: string) => `No plans with ${groupName} in 15 days`,
        body: (groupName: string) => `${groupName} has been quiet. Start a plan and bring everyone back together.`,
    },
    {
        title: (groupName: string) => `${groupName} needs a new plan`,
        body: (groupName: string) => `It has been 15 days since the last plan in ${groupName}. Time to make one?`,
    },
    {
        title: (groupName: string) => `Plan something with ${groupName}`,
        body: (groupName: string) => `No one has made a plan here in 15 days. Pick a time and get the Mandali moving.`,
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

function groupPlanNotificationData(groupId: string) {
    return {
        type: 'plan_inactivity',
        groupId,
        url: `mandali://plans`,
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
    const missingRsvpUserIds = await loadMissingRsvpUserIds(plan);

    if (!missingRsvpUserIds.length) {
        console.log(`[PlanLifecycleCron] Plan ${plan.id} has no pending RSVPs. Skipping reminder.`);
        return false;
    }

    await Promise.all(
        missingRsvpUserIds.map((userId) =>
            sendUserPushNotification(
                userId,
                variant.title,
                variant.body(plan.activity_label || 'Your plan', formatPlanWhen(plan.starts_at)),
                planNotificationData(plan)
            )
        )
    );
    return true;
}

async function sendPlanInactivityNotification(group: { id: string; name: string }, now = new Date()) {
    const variant = pickVariant(INACTIVITY_NOTIFICATION_VARIANTS, group.id, now);
    const memberIds = await loadGroupMemberIds(group.id);

    if (!memberIds.length) {
        console.log(`[PlanLifecycleCron] Group ${group.id} has no members for inactivity notification.`);
        return false;
    }

    await Promise.all(
        memberIds.map((userId) =>
            sendUserPushNotification(
                userId,
                variant.title(group.name || 'your group'),
                variant.body(group.name || 'Your group'),
                groupPlanNotificationData(group.id)
            )
        )
    );
    return true;
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
        completedPlans.forEach((plan) => sentPlanReminderIds.delete(plan.id));
    }

    return {
        activated: activatedPlans?.length ?? 0,
        completed: completedPlans?.length ?? 0,
    };
}

function isPlanReminderWindow(startsAt: string, now: Date): boolean {
    const timeUntilStart = new Date(startsAt).getTime() - now.getTime();
    if (timeUntilStart <= 0) return false;

    const isOneDayWindow =
        timeUntilStart <= PLAN_REMINDER_ONE_DAY_MS &&
        timeUntilStart > PLAN_REMINDER_ONE_DAY_MS - PLAN_REMINDER_INTERVAL_MS;
    const isFinalWindow =
        timeUntilStart <= PLAN_REMINDER_FINAL_MAX_MS &&
        timeUntilStart >= PLAN_REMINDER_FINAL_MIN_MS;

    return isOneDayWindow || isFinalWindow;
}

async function loadMissingRsvpUserIds(plan: { id: string; group_id: string }): Promise<string[]> {
    const [{ data: members, error: membersError }, { data: rsvps, error: rsvpsError }] = await Promise.all([
        supabase.from('group_members').select('user_id').eq('group_id', plan.group_id),
        supabase.from('plan_rsvps').select('user_id').eq('plan_id', plan.id),
    ]);

    if (membersError) {
        console.error('[PlanLifecycleCron] Failed to load group members for RSVP reminder:', membersError);
        throw membersError;
    }

    if (rsvpsError) {
        console.error('[PlanLifecycleCron] Failed to load RSVPs for reminder:', rsvpsError);
        throw rsvpsError;
    }

    const rsvpUserIds = new Set((rsvps || []).map((row) => String(row.user_id).toLowerCase()));
    return (members || [])
        .map((member) => member.user_id)
        .filter((userId): userId is string => typeof userId === 'string' && !rsvpUserIds.has(userId.toLowerCase()));
}

async function loadGroupMemberIds(groupId: string): Promise<string[]> {
    const { data, error } = await supabase.from('group_members').select('user_id').eq('group_id', groupId);

    if (error) {
        console.error('[PlanLifecycleCron] Failed to load group members:', error);
        throw error;
    }

    return (data || []).map((member) => member.user_id).filter((userId): userId is string => typeof userId === 'string');
}

function notificationKeyForGroupInactivity(groupId: string, lastPlanOrGroupCreatedAt: string | null | undefined): string {
    return `${groupId}:${lastPlanOrGroupCreatedAt || 'no-plan-date'}`;
}

export async function runPlanReminderCheck(now = new Date()) {
    const nowIso = now.toISOString();
    console.log(`[PlanLifecycleCron] Checking RSVP reminders at ${nowIso}`);

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
        console.log('[PlanLifecycleCron] No upcoming plans need RSVP reminders.');
        return { reminded: 0 };
    }

    const eligiblePlans = upcomingPlans.filter(
        (plan) => !sentPlanReminderIds.has(plan.id) && isPlanReminderWindow(plan.starts_at, now)
    );

    if (!eligiblePlans.length) {
        console.log('[PlanLifecycleCron] No plans are in the RSVP reminder window.');
        return { reminded: 0 };
    }

    const results = await Promise.all(
        eligiblePlans.map(async (plan) => {
            const sent = await sendPlanReminderNotification(plan, now);
            if (sent) sentPlanReminderIds.add(plan.id);
            return sent;
        })
    );
    const reminded = results.filter(Boolean).length;
    console.log(`[PlanLifecycleCron] Sent RSVP reminder notification(s) for ${reminded} upcoming plan(s).`);
    return { reminded };
}

export async function runPlanInactivityCheck(now = new Date()) {
    const cutoff = new Date(now.getTime() - PLAN_INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoff.toISOString();
    console.log(`[PlanLifecycleCron] Checking groups without plans since ${cutoffIso}`);

    const [{ data: groups, error: groupsError }, { data: recentPlans, error: recentPlansError }] = await Promise.all([
        supabase.from('groups').select('id, name, created_at').lte('created_at', cutoffIso),
        supabase
            .from('plans')
            .select('id, group_id, created_at')
            .gte('created_at', cutoffIso)
            .order('created_at', { ascending: false }),
    ]);

    if (groupsError) {
        console.error('[PlanLifecycleCron] Failed to load groups for inactivity check:', groupsError);
        throw groupsError;
    }

    if (recentPlansError) {
        console.error('[PlanLifecycleCron] Failed to load recent plans for inactivity check:', recentPlansError);
        throw recentPlansError;
    }

    if (!groups?.length) {
        console.log('[PlanLifecycleCron] No old enough groups need inactivity checks.');
        return { reminded: 0 };
    }

    const groupsWithRecentPlans = new Set((recentPlans || []).map((plan) => plan.group_id));
    const inactiveGroups = groups.filter((group) => !groupsWithRecentPlans.has(group.id));

    if (!inactiveGroups.length) {
        console.log('[PlanLifecycleCron] Every checked group has a recent plan.');
        return { reminded: 0 };
    }

    const { data: latestPlans, error: latestPlansError } = await supabase
        .from('plans')
        .select('id, group_id, created_at')
        .in(
            'group_id',
            inactiveGroups.map((group) => group.id)
        )
        .order('created_at', { ascending: false });

    if (latestPlansError) {
        console.error('[PlanLifecycleCron] Failed to load latest plans for inactive groups:', latestPlansError);
        throw latestPlansError;
    }

    const latestPlanCreatedAtByGroup = new Map<string, string>();
    for (const plan of latestPlans || []) {
        if (!latestPlanCreatedAtByGroup.has(plan.group_id)) {
            latestPlanCreatedAtByGroup.set(plan.group_id, plan.created_at);
        }
    }

    const results = await Promise.all(
        inactiveGroups.map(async (group) => {
            const key = notificationKeyForGroupInactivity(
                group.id,
                latestPlanCreatedAtByGroup.get(group.id) || group.created_at
            );

            if (sentPlanInactivityKeys.has(key)) return false;

            const sent = await sendPlanInactivityNotification(group, now);
            if (sent) sentPlanInactivityKeys.add(key);
            return sent;
        })
    );

    const reminded = results.filter(Boolean).length;
    console.log(`[PlanLifecycleCron] Sent inactivity notification(s) for ${reminded} group(s).`);
    return { reminded };
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
        process.env.PLAN_REMINDER_CRON || '0,15,30,45 * * * *',
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

    cron.schedule(
        process.env.PLAN_INACTIVITY_CRON || '0 10 * * *',
        async () => {
            try {
                await runPlanInactivityCheck();
            } catch (err) {
                console.error('[PlanLifecycleCron] Fatal error during inactivity cron execution:', err);
            }
        },
        {
            timezone: PLAN_NOTIFICATION_TIMEZONE,
        }
    );

    console.log('[PlanLifecycleCron] Scheduled: every 15 minutes at :00, :15, :30, :45');
    console.log('[PlanLifecycleCron] RSVP reminders scheduled every 15 minutes');
    console.log('[PlanLifecycleCron] Plan inactivity reminders scheduled daily at 10:00');
}
