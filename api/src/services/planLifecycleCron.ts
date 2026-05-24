import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { sendGroupPushNotification, sendUserPushNotification } from '../lib/push';

const PLAN_NOTIFICATION_TIMEZONE = process.env.PLAN_CRON_TIMEZONE || 'Asia/Kolkata';
const PLAN_NOTIFICATION_DISPLAY_TIMEZONE = 'Asia/Kolkata';
const PLAN_REMINDER_INTERVAL_MS = 15 * 60 * 1000;
const PLAN_REMINDER_ONE_DAY_MS = 24 * 60 * 60 * 1000;
const PLAN_REMINDER_FINAL_MIN_MS = 60 * 60 * 1000;
const PLAN_REMINDER_FINAL_MAX_MS = 2 * 60 * 60 * 1000;
const PLAN_INACTIVITY_START_DAYS = 15;
const PLAN_INACTIVITY_COOLDOWN_DAYS = 5;
const PLAN_RSVP_REMINDER_NOTIFICATION_TYPE = 'plan_rsvp_reminder';
const PLAN_INACTIVITY_NOTIFICATION_TYPE = 'plan_inactivity';

const LIVE_NOTIFICATION_VARIANTS = [
    {
        title: 'Your Mandali plan is live',
        body: (planName: string, groupName: string) =>
            `${planName} with ${groupName} is happening now. Open the plan and keep everyone in sync.`,
    },
    {
        title: 'The plan just went live',
        body: (planName: string, groupName: string) =>
            `${planName} with ${groupName} has started. Time to jump in with your Mandali.`,
    },
    {
        title: 'It is go time',
        body: (planName: string, groupName: string) =>
            `${planName} with ${groupName} is live now. Check the plan hub for details and updates.`,
    },
];

const REMINDER_NOTIFICATION_VARIANTS = [
    {
        title: 'Plan reminder',
        body: (planName: string, groupName: string, when: string) =>
            `${planName} with ${groupName} is coming up ${when}. RSVP or check the details when you have a minute.`,
    },
    {
        title: 'Your Mandali has plans',
        body: (planName: string, groupName: string, when: string) =>
            `${planName} with ${groupName} is still on for ${when}. A tiny nudge from your calendar corner.`,
    },
    {
        title: 'Do not miss this plan',
        body: (planName: string, groupName: string, when: string) =>
            `${planName} with ${groupName} is scheduled ${when}. Open Mandali to see who is in.`,
    },
];

const SCHEDULED_NOTIFICATION_VARIANTS = [
    {
        title: 'New plan on Mandali',
        body: (planName: string, groupName: string, when: string) =>
            `${planName} with ${groupName} is planned for ${when}. Open it up and let the group know if you are in.`,
    },
    {
        title: 'A plan just landed',
        body: (planName: string, groupName: string, when: string) =>
            `${planName} with ${groupName} is now on the calendar for ${when}.`,
    },
    {
        title: 'Your Mandali has a new plan',
        body: (planName: string, groupName: string, when: string) =>
            `${planName} with ${groupName} is scheduled for ${when}. Check the details when you can.`,
    },
];

const INACTIVITY_NOTIFICATION_VARIANTS = [
    {
        title: (groupName: string, days: number) => `No plans with ${groupName} in ${days} days`,
        body: (groupName: string) => `${groupName} has been quiet. Start a plan and bring everyone back together.`,
    },
    {
        title: (groupName: string) => `${groupName} needs a new plan`,
        body: (groupName: string, days: number) =>
            `It has been ${days} days since the last plan in ${groupName}. Time to make one?`,
    },
    {
        title: (groupName: string) => `Plan something with ${groupName}`,
        body: (_groupName: string, days: number) =>
            `No one has made a plan here in ${days} days. Pick a time and get the Mandali moving.`,
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
    const date = starts.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: PLAN_NOTIFICATION_DISPLAY_TIMEZONE,
    });
    const time = starts.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: PLAN_NOTIFICATION_DISPLAY_TIMEZONE,
    });
    return `${date} at ${time} IST`;
}

function planName(plan: { activity_label?: string | null }): string {
    return plan.activity_label?.trim() || 'Your plan';
}

function planGroupName(plan: { group?: { name?: string | null } | null }): string {
    return plan.group?.name?.trim() || 'your Mandali';
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
        variant.body(planName(plan), planGroupName(plan)),
        planNotificationData(plan)
    );
}

async function sendPlanReminderNotification(plan: any, now = new Date()) {
    const variant = pickVariant(REMINDER_NOTIFICATION_VARIANTS, plan.id, now);
    const missingRsvpUserIds = await loadMissingRsvpUserIds(plan);
    const title = variant.title;
    const body = variant.body(planName(plan), planGroupName(plan), formatPlanWhen(plan.starts_at));

    if (!missingRsvpUserIds.length) {
        console.log(`[PlanLifecycleCron] Plan ${plan.id} has no pending RSVPs. Skipping reminder.`);
        return false;
    }

    const results = await Promise.all(
        missingRsvpUserIds.map(async (userId) => {
            const dedupeKey = [PLAN_RSVP_REMINDER_NOTIFICATION_TYPE, plan.id, userId].join(':');
            const reserved = await reserveNotificationDelivery({
                notificationType: PLAN_RSVP_REMINDER_NOTIFICATION_TYPE,
                dedupeKey,
                groupId: plan.group_id,
                planId: plan.id,
                userId,
                title,
                body,
            });

            if (!reserved) return false;

            await sendUserPushNotification(userId, title, body, planNotificationData(plan));
            await markNotificationDeliverySent(dedupeKey);
            return true;
        })
    );
    return results.some(Boolean);
}

async function sendPlanInactivityNotificationToUser(
    group: { id: string; name: string },
    userId: string,
    daysInactive: number,
    lastPlanOrGroupCreatedAt: string,
    now = new Date()
) {
    const variant = pickVariant(INACTIVITY_NOTIFICATION_VARIANTS, `${group.id}:${daysInactive}`, now);
    const groupName = group.name || 'your group';
    const title = variant.title(groupName, daysInactive);
    const body = variant.body(groupName, daysInactive);
    const dedupeKey = [
        PLAN_INACTIVITY_NOTIFICATION_TYPE,
        group.id,
        userId,
        lastPlanOrGroupCreatedAt,
        inactivityCooldownBucket(now),
    ].join(':');

    const reserved = await reserveNotificationDelivery({
        notificationType: PLAN_INACTIVITY_NOTIFICATION_TYPE,
        dedupeKey,
        groupId: group.id,
        userId,
        title,
        body,
    });

    if (!reserved) {
        return false;
    }

    await sendUserPushNotification(userId, title, body, groupPlanNotificationData(group.id));
    await markNotificationDeliverySent(dedupeKey);
    return true;
}

export async function sendPlanScheduledNotification(plan: any, now = new Date()) {
    const variant = pickVariant(SCHEDULED_NOTIFICATION_VARIANTS, plan.id, now);
    await sendGroupPushNotification(
        plan.group_id,
        plan.created_by,
        variant.title,
        variant.body(planName(plan), planGroupName(plan), formatPlanWhen(plan.starts_at)),
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
        .select('id, group_id, created_by, activity_label, starts_at, group:group_id(name)');

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

function daysSince(dateString: string, now: Date): number {
    const timestamp = new Date(dateString).getTime();
    if (Number.isNaN(timestamp)) return 0;
    return Math.floor((now.getTime() - timestamp) / (24 * 60 * 60 * 1000));
}

function inactivityCooldownBucket(now: Date): string {
    const bucketMs = PLAN_INACTIVITY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    return String(Math.floor(now.getTime() / bucketMs));
}

async function reserveNotificationDelivery({
    notificationType,
    dedupeKey,
    groupId,
    planId,
    userId,
    title,
    body,
}: {
    notificationType: string;
    dedupeKey: string;
    groupId?: string | null;
    planId?: string | null;
    userId?: string | null;
    title: string;
    body: string;
}) {
    const { error } = await supabase.from('notification_deliveries').insert({
        notification_type: notificationType,
        dedupe_key: dedupeKey,
        group_id: groupId ?? null,
        plan_id: planId ?? null,
        user_id: userId ?? null,
        title,
        body,
        status: 'sending',
    });

    if (!error) return true;

    if (error.code === '23505') {
        return false;
    }

    console.error('[PlanLifecycleCron] Failed to reserve notification delivery:', error);
    throw error;
}

async function markNotificationDeliverySent(dedupeKey: string) {
    const { error } = await supabase
        .from('notification_deliveries')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('dedupe_key', dedupeKey);

    if (error) {
        console.error('[PlanLifecycleCron] Failed to mark notification delivery sent:', error);
        throw error;
    }
}

async function loadRecentlyNotifiedGroupIds(groupIds: string[], sinceIso: string): Promise<Set<string>> {
    if (!groupIds.length) return new Set();

    const { data, error } = await supabase
        .from('notification_deliveries')
        .select('group_id')
        .eq('notification_type', PLAN_INACTIVITY_NOTIFICATION_TYPE)
        .in('group_id', groupIds)
        .in('status', ['sending', 'sent'])
        .gte('sent_at', sinceIso);

    if (error) {
        console.error('[PlanLifecycleCron] Failed to load recent group inactivity notifications:', error);
        throw error;
    }

    return new Set((data || []).map((row) => row.group_id).filter((groupId): groupId is string => typeof groupId === 'string'));
}

async function loadRecentlyNotifiedUserIds(userIds: string[], sinceIso: string): Promise<Set<string>> {
    if (!userIds.length) return new Set();

    const { data, error } = await supabase
        .from('notification_deliveries')
        .select('user_id')
        .eq('notification_type', PLAN_INACTIVITY_NOTIFICATION_TYPE)
        .in('user_id', userIds)
        .in('status', ['sending', 'sent'])
        .gte('sent_at', sinceIso);

    if (error) {
        console.error('[PlanLifecycleCron] Failed to load recent user inactivity notifications:', error);
        throw error;
    }

    return new Set((data || []).map((row) => row.user_id).filter((userId): userId is string => typeof userId === 'string'));
}

export async function runPlanReminderCheck(now = new Date()) {
    const nowIso = now.toISOString();
    console.log(`[PlanLifecycleCron] Checking RSVP reminders at ${nowIso}`);

    const { data: upcomingPlans, error } = await supabase
        .from('plans')
        .select('id, group_id, created_by, activity_label, starts_at, group:group_id(name)')
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

    const eligiblePlans = upcomingPlans.filter((plan) => isPlanReminderWindow(plan.starts_at, now));

    if (!eligiblePlans.length) {
        console.log('[PlanLifecycleCron] No plans are in the RSVP reminder window.');
        return { reminded: 0 };
    }

    const results = await Promise.all(
        eligiblePlans.map(async (plan) => {
            const sent = await sendPlanReminderNotification(plan, now);
            return sent;
        })
    );
    const reminded = results.filter(Boolean).length;
    console.log(`[PlanLifecycleCron] Sent RSVP reminder notification(s) for ${reminded} upcoming plan(s).`);
    return { reminded };
}

export async function runPlanInactivityCheck(now = new Date()) {
    const cutoff = new Date(now.getTime() - PLAN_INACTIVITY_START_DAYS * 24 * 60 * 60 * 1000);
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

    const inactiveCandidates = inactiveGroups
        .map((group) => {
            const lastPlanOrGroupCreatedAt = latestPlanCreatedAtByGroup.get(group.id) || group.created_at;
            return {
                group,
                lastPlanOrGroupCreatedAt,
                daysInactive: daysSince(lastPlanOrGroupCreatedAt, now),
            };
        })
        .filter((candidate) => candidate.daysInactive >= PLAN_INACTIVITY_START_DAYS)
        .sort((a, b) => b.daysInactive - a.daysInactive);

    if (!inactiveCandidates.length) {
        console.log('[PlanLifecycleCron] No groups have reached the inactivity threshold.');
        return { reminded: 0 };
    }

    const cooldownSinceIso = new Date(
        now.getTime() - PLAN_INACTIVITY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const inactiveGroupIds = inactiveCandidates.map((candidate) => candidate.group.id);
    const recentlyNotifiedGroupIds = await loadRecentlyNotifiedGroupIds(inactiveGroupIds, cooldownSinceIso);
    const eligibleCandidates = inactiveCandidates.filter(
        (candidate) => !recentlyNotifiedGroupIds.has(candidate.group.id)
    );

    if (!eligibleCandidates.length) {
        console.log('[PlanLifecycleCron] Inactive groups were already notified within the cooldown window.');
        return { reminded: 0 };
    }

    const { data: memberships, error: membershipsError } = await supabase
        .from('group_members')
        .select('group_id, user_id')
        .in(
            'group_id',
            eligibleCandidates.map((candidate) => candidate.group.id)
        );

    if (membershipsError) {
        console.error('[PlanLifecycleCron] Failed to load memberships for inactive groups:', membershipsError);
        throw membershipsError;
    }

    const groupById = new Map(eligibleCandidates.map((candidate) => [candidate.group.id, candidate]));
    const userIds = Array.from(new Set((memberships || []).map((row) => row.user_id).filter(Boolean)));
    const recentlyNotifiedUserIds = await loadRecentlyNotifiedUserIds(userIds, cooldownSinceIso);
    const candidateByUserId = new Map<string, (typeof eligibleCandidates)[number]>();

    for (const membership of memberships || []) {
        if (typeof membership.user_id !== 'string' || recentlyNotifiedUserIds.has(membership.user_id)) continue;

        const candidate = groupById.get(membership.group_id);
        if (!candidate) continue;

        const current = candidateByUserId.get(membership.user_id);
        if (!current || candidate.daysInactive > current.daysInactive) {
            candidateByUserId.set(membership.user_id, candidate);
        }
    }

    if (!candidateByUserId.size) {
        console.log('[PlanLifecycleCron] All members of inactive groups were already notified within the cooldown window.');
        return { reminded: 0 };
    }

    const results = await Promise.all(
        Array.from(candidateByUserId.entries()).map(([userId, candidate]) =>
            sendPlanInactivityNotificationToUser(
                candidate.group,
                userId,
                candidate.daysInactive,
                candidate.lastPlanOrGroupCreatedAt,
                now
            )
        )
    );
    const reminded = results.filter(Boolean).length;
    console.log(`[PlanLifecycleCron] Sent inactivity notification(s) to ${reminded} member(s).`);
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
    console.log('[PlanLifecycleCron] Plan inactivity checker scheduled daily at 10:00');
}
