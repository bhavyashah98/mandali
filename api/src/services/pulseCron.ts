import cron from 'node-cron';
import { supabase } from '../lib/supabase';
import { calculateGroupPulseInternal, getPulseRank } from '../utils/pulse';
import { sendGroupPushNotification } from '../lib/push';
import { createGroupNotification } from './notificationService';
import { NOTIFICATION_TYPES } from '../types/notifications';

// ─────────────────────────────────────────────────────────────
// Pulse Cron Service
// Runs four times daily at 12:00 AM, 6:00 AM, 12:00 PM, and 6:00 PM IST.
//
// For every group that is:
//   - At least 7 days old
//   - Has more than 1 member
//
// Recalculates pulse_score, pulse_rank, pulse_delta, pulse_percentile,
// pulse_leaderboard_rank, pulse_leaderboard_total, and pulse_last_calculated_at.
//
// Notification rules:
//   - Score INCREASED → send push + in-app notification to all members
//   - Score stayed same or decreased → silent DB-only update, no notification
// ─────────────────────────────────────────────────────────────

/**
 * Main pulse recalculation logic.
 * Fetches all eligible groups and updates their pulse scores.
 */
export const runPulseRecalculation = async () => {
    const startTime = Date.now();
    console.log('[PulseCron] ─── Starting scheduled pulse recalculation ───');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Fetch all groups that are at least 7 days old.
    const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id, name, pulse_score')
        .lt('created_at', sevenDaysAgo.toISOString());

    if (groupsError || !groups) {
        console.error('[PulseCron] Failed to fetch groups:', groupsError);
        return;
    }

    console.log(`[PulseCron] Found ${groups.length} groups older than 7 days`);

    let processed = 0;
    let skipped = 0;
    let notified = 0;
    let errors = 0;
    const recalculatedGroups: Array<{
        id: string;
        name: string;
        oldPulseScore: number;
        newPulseScore: number;
        newPulseRank: string;
    }> = [];

    for (const group of groups) {
        try {
            // 2. Check member count — skip if 1 or fewer members
            const { count: memberCount, error: countError } = await supabase
                .from('group_members')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', group.id);

            if (countError) {
                console.error(`[PulseCron] Failed to count members for group ${group.id}:`, countError);
                errors++;
                continue;
            }

            if (!memberCount || memberCount <= 1) {
                skipped++;
                continue;
            }

            // 3. Calculate new pulse score using the shared utility
            const pulseData = await calculateGroupPulseInternal(group.id, now);
            const newPulseScore = pulseData.pulse;
            const newPulseRank = getPulseRank(newPulseScore);
            const oldPulseScore = group.pulse_score ?? 0;

            // 4. Persist base pulse values. Percentile is updated after all eligible groups are scored.
            const { error: updateError } = await supabase
                .from('groups')
                .update({
                    pulse_score: newPulseScore,
                    pulse_rank: newPulseRank,
                    pulse_delta: newPulseScore - oldPulseScore,
                    pulse_last_calculated_at: now.toISOString(),
                })
                .eq('id', group.id);

            if (updateError) {
                console.error(`[PulseCron] Failed to update pulse for group ${group.id} ("${group.name}"):`, updateError);
                errors++;
                continue;
            }

            recalculatedGroups.push({
                id: group.id,
                name: group.name,
                oldPulseScore,
                newPulseScore,
                newPulseRank,
            });

            console.log(`[PulseCron] ✅ ${group.name} → ${oldPulseScore} → ${newPulseScore} (${newPulseRank})`);
            processed++;

            // 5. Only notify if pulse INCREASED — never notify for drops or unchanged
            if (newPulseScore > oldPulseScore) {
                const delta = newPulseScore - oldPulseScore;

                // In-app notification for all group members (no actor exclusion)
                await createGroupNotification(
                    group.id,
                    NOTIFICATION_TYPES.PULSE_INCREASED,
                    `${newPulseRank} ⚡ Your Mandali is growing!`,
                    `${group.name}'s Pulse rose by +${delta} to ${newPulseScore}. Keep the energy going!`,
                    undefined, // no exclusion — notify everyone
                    undefined,
                    undefined,
                    { pulseScore: newPulseScore, pulseDelta: delta, pulseRank: newPulseRank }
                );

                // Push notification
                await sendGroupPushNotification(
                    group.id,
                    '', // empty sender — no one is excluded from the push
                    `${newPulseRank} ⚡ Your Mandali is growing!`,
                    `${group.name}'s Pulse rose by +${delta} to ${newPulseScore}. Keep the energy going!`,
                    { type: 'pulse_increased', groupId: group.id, pulseScore: newPulseScore }
                );

                console.log(`[PulseCron] 🔔 Notified group "${group.name}" (+${delta} pulse increase)`);
                notified++;
            }
        } catch (err) {
            console.error(`[PulseCron] Unexpected error for group ${group.id}:`, err);
            errors++;
        }
    }

    if (recalculatedGroups.length > 0) {
        const allScores = recalculatedGroups.map(group => group.newPulseScore);
        const rankedScores = [...new Set(allScores)].sort((a, b) => b - a);
        const scoredGroups = recalculatedGroups.map(group => ({
            ...group,
            pulsePercentile: calculatePulsePercentile(group.newPulseScore, allScores),
            leaderboardRank: rankedScores.indexOf(group.newPulseScore) + 1,
            leaderboardTotal: recalculatedGroups.length,
        }));

        const percentileUpdates = scoredGroups.map(group =>
            supabase
                .from('groups')
                .update({
                    pulse_percentile: group.pulsePercentile,
                    pulse_leaderboard_rank: group.leaderboardRank,
                    pulse_leaderboard_total: group.leaderboardTotal,
                })
                .eq('id', group.id)
        );

        const percentileResults = await Promise.all(percentileUpdates);
        percentileResults.forEach((result, index) => {
            if (result.error) {
                console.error(`[PulseCron] Failed to update percentile for group ${scoredGroups[index].id}:`, result.error);
                errors++;
            }
        });
    }

    const elapsed = Date.now() - startTime;
    console.log(`[PulseCron] ─── Completed in ${elapsed}ms | processed=${processed} notified=${notified} skipped=${skipped} errors=${errors} ───`);

    return { processed, notified, skipped, errors, elapsedMs: elapsed };
};

const calculatePulsePercentile = (pulseScore: number, allScores: number[]) => {
    if (allScores.length <= 1) return 0;

    const lowerScoreCount = allScores.filter(score => score < pulseScore).length;
    return Math.round((lowerScoreCount / (allScores.length - 1)) * 100);
};

/**
 * Initialize the pulse cron job.
 * Scheduled to run four times daily in the Asia/Kolkata timezone.
 */
export const initPulseCron = () => {
    cron.schedule('0 0,6,12,18 * * *', async () => {
        console.log('[PulseCron] ⏰ Cron triggered for scheduled IST pulse refresh');
        try {
            await runPulseRecalculation();
        } catch (err) {
            console.error('[PulseCron] Fatal error during cron execution:', err);
        }
    }, {
        timezone: 'Asia/Kolkata',
    });

    console.log('[PulseCron] ✅ Scheduled: 12:00 AM, 6:00 AM, 12:00 PM, and 6:00 PM IST (Asia/Kolkata)');
};
