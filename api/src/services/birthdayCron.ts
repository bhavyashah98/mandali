import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { sendGroupPushNotification, sendUserPushNotification } from '../lib/push';

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
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');

    // Use Supabase text pattern matching on the birthday column
    // Birthday format: YYYY-MM-DD → match suffix '-MM-DD'
    const pattern = `%-${mm}-${dd}`;

    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, birthday')
        .like('birthday', pattern);

    if (error) {
        console.error('[BirthdayCron] Error fetching users by birthday:', error);
        return [];
    }

    return users || [];
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

/**
 * Main birthday check logic.
 * @param baseDate Optional date override for testing (defaults to current time)
 */
export const runBirthdayChecks = async (baseDate?: Date) => {
    const startTime = Date.now();
    console.log('[BirthdayCron] ─── Starting birthday checks ───');

    const { today, upcoming } = getISTDates(baseDate);
    console.log(`[BirthdayCron] Today (IST): ${today.month}/${today.day}`);
    console.log(`[BirthdayCron] Upcoming (+3 days): ${upcoming.month}/${upcoming.day}`);

    // ── 1. Happy Birthday Today ──────────────────────────────
    const birthdayTodayUsers = await fetchUsersWithBirthday(today.month, today.day);
    console.log(`[BirthdayCron] Users with birthday TODAY: ${birthdayTodayUsers.length}`);

    for (const user of birthdayTodayUsers) {
        console.log(`[BirthdayCron] 🎂 Happy Birthday: ${user.name} (${user.id})`);

        // Send personal wish to the birthday person
        await sendUserPushNotification(
            user.id,
            '🎂 Happy Birthday!',
            `Wishing you a wonderful birthday, ${user.name}! Your Mandali family celebrates you today! 🎉`,
            { type: 'birthday_wish', userId: user.id }
        );

        // Notify all groups the user belongs to (excluding the birthday person)
        const groupIds = await fetchUserGroups(user.id);
        console.log(`[BirthdayCron]   → Found ${groupIds.length} groups for ${user.name}`);

        for (const groupId of groupIds) {
            await sendGroupPushNotification(
                groupId,
                user.id, // sender = birthday person → they get excluded
                '🎂 Birthday Alert!',
                `It's ${user.name}'s birthday today! Send them some love! 🎉❤️`,
                { type: 'birthday_today', userId: user.id, groupId }
            );
        }
    }

    // ── 2. Upcoming Birthday in 3 Days ───────────────────────
    const upcomingUsers = await fetchUsersWithBirthday(upcoming.month, upcoming.day);
    console.log(`[BirthdayCron] Users with birthday in 3 DAYS: ${upcomingUsers.length}`);

    for (const user of upcomingUsers) {
        console.log(`[BirthdayCron] 🎁 Upcoming Birthday: ${user.name} (${user.id})`);

        // Notify all groups (exclude the birthday person so it's a surprise)
        const groupIds = await fetchUserGroups(user.id);
        console.log(`[BirthdayCron]   → Found ${groupIds.length} groups for ${user.name}`);

        for (const groupId of groupIds) {
            await sendGroupPushNotification(
                groupId,
                user.id, // sender = birthday person → they get excluded
                '🎁 Birthday Coming Up!',
                `${user.name}'s birthday is in 3 days! Time to plan something special! 🎊`,
                { type: 'birthday_upcoming', userId: user.id, groupId }
            );
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

/**
 * Initialize the birthday cron job.
 * Scheduled to run daily at 12:00 AM IST (Asia/Kolkata timezone).
 */
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
