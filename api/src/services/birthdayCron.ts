import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { sendGroupPushNotification, sendUserPushNotification } from '../lib/push';
import { createNotification } from './notificationService';
import { NOTIFICATION_TYPES } from '../types/notifications';

// ─────────────────────────────────────────────────────────────
// Birthday Cron Service
// Runs daily at 12:00 AM IST (Asia/Kolkata)
//
// 1. Birthday TODAY  → Personal wish to the user
//                     → Group notification to everyone else
// 2. Birthday in 3 days → Group notification to everyone
//                          EXCEPT the birthday person (surprise!)
// ─────────────────────────────────────────────────────────────

/**
 * Get today's date and today+3 date in IST as { month, day } objects.
 * Accepts an optional baseDate for testing.
 */
const getISTDates = (baseDate?: Date) => {
    const now = baseDate || new Date();

    // Convert to IST by using toLocaleDateString with the Asia/Kolkata timezone
    const istFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    // Today in IST
    const todayParts = istFormatter.formatToParts(now);
    const todayMonth = parseInt(todayParts.find(p => p.type === 'month')!.value, 10);
    const todayDay = parseInt(todayParts.find(p => p.type === 'day')!.value, 10);

    // Today + 3 days
    const future = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const futureParts = istFormatter.formatToParts(future);
    const futureMonth = parseInt(futureParts.find(p => p.type === 'month')!.value, 10);
    const futureDay = parseInt(futureParts.find(p => p.type === 'day')!.value, 10);

    return {
        today: { month: todayMonth, day: todayDay },
        upcoming: { month: futureMonth, day: futureDay },
    };
};

/**
 * Fetch all users whose birthday (month, day) matches the given month/day.
 * Birthday is stored as 'YYYY-MM-DD' in the users table.
 */
const fetchUsersWithBirthday = async (month: number, day: number) => {
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, birthday')
        .not('birthday', 'is', null);

    if (error) {
        console.error('[BirthdayCron] Error fetching users by birthday:', error);
        return [];
    }

    return (users || []).filter((user: any) => {
        const parts = String(user.birthday || '').slice(0, 10).split('-');
        return Number(parts[1]) === month && Number(parts[2]) === day;
    });
};

/**
 * Fetch all group IDs a user belongs to.
 */
const fetchUserGroups = async (userId: string): Promise<string[]> => {
    const { data: memberships, error } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);

    if (error) {
        console.error(`[BirthdayCron] Error fetching groups for user ${userId}:`, error);
        return [];
    }

    return (memberships || []).map((m: any) => m.group_id);
};

interface UniqueMemberWithGroup {
    userId: string;
    groupId: string;
}

/**
 * Fetch unique member IDs across multiple groups, excluding the birthday person.
 * Returns each unique member with one of the shared group IDs they belong to.
 */
const fetchUniqueGroupMembers = async (groupIds: string[], excludeUserId: string): Promise<UniqueMemberWithGroup[]> => {
    if (groupIds.length === 0) return [];

    const { data: memberships, error } = await supabase
        .from('group_members')
        .select('user_id, group_id')
        .in('group_id', groupIds)
        .neq('user_id', excludeUserId);

    if (error || !memberships) {
        console.error('[BirthdayCron] Error fetching unique group members:', error);
        return [];
    }

    // Keep only the first group_id for each unique user_id
    const seen = new Map<string, string>();
    for (const m of memberships) {
        if (!seen.has(m.user_id)) {
            seen.set(m.user_id, m.group_id);
        }
    }

    return Array.from(seen.entries()).map(([userId, groupId]) => ({
        userId,
        groupId,
    }));
};

/**
 * Check if a user has already received a birthday notification for a specific birthday person today.
 * Uses birthdayPersonId in metadata as the dedup key (not groupId) so members in multiple shared
 * groups only receive one notification per birthday person per day.
 */
const hasBirthdayNotificationForPerson = async (userId: string, type: string, runDate: string, birthdayPersonId: string): Promise<boolean> => {
    const { data } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('notification_type', type)
        .eq('metadata->>birthdayRunDate', runDate)
        .eq('metadata->>birthdayPersonId', birthdayPersonId)
        .limit(1);
    return !!data?.length;
};

/**
 * Notify unique members across all of a birthday person's groups — each recipient gets exactly
 * ONE notification regardless of how many groups they share with the birthday person.
 * Returns the list of user IDs that were newly notified (for push notification batching).
 */
const notifyUniqueGroupMembersForBirthday = async (
    groupIds: string[],
    birthdayPersonId: string,
    type: any,
    title: string,
    body: string,
    runDate: string,
    metadata: any
): Promise<string[]> => {
    const uniqueMembers = await fetchUniqueGroupMembers(groupIds, birthdayPersonId);
    console.log(`[BirthdayCron]   → Unique members to notify: ${uniqueMembers.length} (across ${groupIds.length} groups)`);

    const notified: string[] = [];
    for (const member of uniqueMembers) {
        const alreadySent = await hasBirthdayNotificationForPerson(member.userId, type, runDate, birthdayPersonId);
        if (alreadySent) continue;

        await createNotification(
            member.userId,
            type,
            title,
            body,
            member.groupId,      // associate with the shared group_id
            birthdayPersonId,
            birthdayPersonId,
            { ...metadata, birthdayRunDate: runDate, birthdayPersonId, groupId: member.groupId }
        );
        notified.push(member.userId);
    }
    return notified;
};

const birthdayRunKey = (baseDate?: Date) => {
    const now = baseDate || new Date();
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
};

const hasBirthdayNotification = async (userId: string, type: string, runDate: string, groupId?: string) => {
    let query = supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('notification_type', type)
        .eq('metadata->>birthdayRunDate', runDate)
        .limit(1);
    if (groupId) query = query.eq('group_id', groupId);
    const { data } = await query;
    return !!data?.length;
};

const createOnce = async (input: {
    userId: string;
    type: any;
    title: string;
    body: string;
    runDate: string;
    groupId?: string;
    actorId?: string;
    entityId?: string;
    metadata?: any;
}) => {
    if (await hasBirthdayNotification(input.userId, input.type, input.runDate, input.groupId)) return false;
    await createNotification(
        input.userId,
        input.type,
        input.title,
        input.body,
        input.groupId,
        input.actorId,
        input.entityId,
        { ...(input.metadata || {}), birthdayRunDate: input.runDate }
    );
    return true;
};

/**
 * Main birthday check logic.
 * @param baseDate Optional date override for testing (defaults to current time)
 */
export const runBirthdayChecks = async (baseDate?: Date) => {
    const startTime = Date.now();
    console.log('[BirthdayCron] ─── Starting birthday checks ───');

    const { today, upcoming } = getISTDates(baseDate);
    const runDate = birthdayRunKey(baseDate);
    console.log(`[BirthdayCron] Today (IST): ${today.month}/${today.day}`);
    console.log(`[BirthdayCron] Upcoming (+3 days): ${upcoming.month}/${upcoming.day}`);

    // ── 1. Happy Birthday Today ──────────────────────────────
    const birthdayTodayUsers = await fetchUsersWithBirthday(today.month, today.day);
    console.log(`[BirthdayCron] Users with birthday TODAY: ${birthdayTodayUsers.length}`);

    for (const user of birthdayTodayUsers) {
        console.log(`[BirthdayCron] 🎂 Happy Birthday: ${user.name} (${user.id})`);

        // Send personal wish to the birthday person
        const personalCreated = await createOnce({
            userId: user.id,
            type: NOTIFICATION_TYPES.BIRTHDAY_WISH,
            title: '🎂 Happy Birthday!',
            body: `Happy birthday, ${user.name}! Your Mandali family celebrates you today! 🎉`,
            runDate,
            actorId: user.id,
            entityId: user.id,
            metadata: { type: 'birthday_wish', userId: user.id },
        });
        if (personalCreated) {
            await sendUserPushNotification(
                user.id,
                '🎂 Happy Birthday!',
                `Happy birthday, ${user.name}! Your Mandali family celebrates you today! 🎉`,
                { type: 'birthday_wish', userId: user.id }
            );
        }

        // Collect all groups and notify UNIQUE members across all groups — one notification each
        const groupIds = await fetchUserGroups(user.id);
        console.log(`[BirthdayCron]   → Found ${groupIds.length} groups for ${user.name}`);

        const notifiedUserIds = await notifyUniqueGroupMembersForBirthday(
            groupIds,
            user.id,
            NOTIFICATION_TYPES.BIRTHDAY_TODAY,
            '🎂 Birthday Alert!',
            `It's ${user.name}'s birthday today! Send them some love! 🎉❤️`,
            runDate,
            { type: 'birthday_today', userId: user.id }
        );

        // Send push to each newly-notified user individually
        for (const recipientId of notifiedUserIds) {
            await sendUserPushNotification(
                recipientId,
                '🎂 Birthday Alert!',
                `It's ${user.name}'s birthday today! Send them some love! 🎉❤️`,
                { type: 'birthday_today', userId: user.id }
            );
        }

        if (notifiedUserIds.length === 0) {
            console.log(`[BirthdayCron]   → All members already notified for ${user.name}'s birthday; skipping.`);
        } else {
            console.log(`[BirthdayCron]   → Notified ${notifiedUserIds.length} unique member(s) for ${user.name}'s birthday.`);
        }
    }

    // ── 2. Upcoming Birthday in 3 Days ───────────────────────
    const upcomingUsers = await fetchUsersWithBirthday(upcoming.month, upcoming.day);
    console.log(`[BirthdayCron] Users with birthday in 3 DAYS: ${upcomingUsers.length}`);

    for (const user of upcomingUsers) {
        console.log(`[BirthdayCron] 🎁 Upcoming Birthday: ${user.name} (${user.id})`);

        const groupIds = await fetchUserGroups(user.id);
        console.log(`[BirthdayCron]   → Found ${groupIds.length} groups for ${user.name}`);

        const notifiedUserIds = await notifyUniqueGroupMembersForBirthday(
            groupIds,
            user.id,
            NOTIFICATION_TYPES.BIRTHDAY_UPCOMING,
            '🎁 Birthday Coming Up!',
            `${user.name}'s birthday is in 3 days! Time to plan something special! 🎊`,
            runDate,
            { type: 'birthday_upcoming', userId: user.id }
        );

        for (const recipientId of notifiedUserIds) {
            await sendUserPushNotification(
                recipientId,
                '🎁 Birthday Coming Up!',
                `${user.name}'s birthday is in 3 days! Time to plan something special! 🎊`,
                { type: 'birthday_upcoming', userId: user.id }
            );
        }

        if (notifiedUserIds.length === 0) {
            console.log(`[BirthdayCron]   → All members already notified for ${user.name}'s upcoming birthday; skipping.`);
        } else {
            console.log(`[BirthdayCron]   → Notified ${notifiedUserIds.length} unique member(s) for ${user.name}'s upcoming birthday.`);
        }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[BirthdayCron] ─── Completed in ${elapsed}ms ───`);

    return {
        birthdayToday: birthdayTodayUsers.map(u => ({ id: u.id, name: u.name })),
        birthdayIn3Days: upcomingUsers.map(u => ({ id: u.id, name: u.name })),
        elapsedMs: elapsed,
    };
};

export const initBirthdayCron = () => {
    // '0 0 * * *' = at minute 0, hour 0 (midnight), every day
    // timezone: 'Asia/Kolkata' ensures this fires at 12:00 AM IST
    cron.schedule('0 0 * * *', async () => {
        console.log('[BirthdayCron] ⏰ Cron triggered at midnight IST');
        try {
            await runBirthdayChecks();
        } catch (err) {
            console.error('[BirthdayCron] Fatal error during cron execution:', err);
        }
    }, {
        timezone: 'Asia/Kolkata',
    });

    console.log('[BirthdayCron] ✅ Scheduled: Daily at 12:00 AM IST (Asia/Kolkata)');
};
