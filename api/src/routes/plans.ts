import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
    formatPlanPayload,
    insertHostRsvp,
    loadMyRsvp,
    loadRsvpsByPlanIds,
    PlanRsvpStatus,
} from './planRsvpHelpers';
import { sendPlanScheduledNotification } from '../services/planLifecycleCron';
import { createGroupNotification } from '../services/notificationService';
import { NOTIFICATION_TYPES } from '../types/notifications';
import planBringRoutes from './planBringRoutes';
import planHypeRoutes from './planHypeRoutes';

const router = Router();

const PLAN_DURATION_MS = 3 * 60 * 60 * 1000;

function emitPlanUpdated(req: AuthRequest, groupId: string, planId: string, action: string) {
    const io = req.app.get('io');
    io?.to(`group_${groupId}`).emit('plan_updated', { planId, action });
    if (action === 'rsvp') io?.to(`group_${groupId}`).emit('plan_hype_updated', { planId });
}

async function assertGroupMember(groupId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle();
    return !!data;
}

async function getUserGroupIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((r) => r.group_id);
}

function resolveEndsAt(startsAt: Date, endsAt?: string | null): Date {
    if (endsAt) return new Date(endsAt);
    return new Date(startsAt.getTime() + PLAN_DURATION_MS);
}

type PlanStatus = 'upcoming' | 'live' | 'past';

function computePlanStatus(startsAt: Date, endsAt: Date, now = new Date()): PlanStatus {
    if (startsAt > now) return 'upcoming';
    if (endsAt < now) return 'past';
    return 'live';
}

function resolvePlanStatus(row: any, now = new Date()): PlanStatus {
    if (row.status === 'past') {
        return 'past';
    }

    return computePlanStatus(new Date(row.starts_at), new Date(row.ends_at), now);
}

async function deletePlanDependents(planId: string) {
    const { data: bringItems, error: bringItemsError } = await supabase
        .from('plan_bring_items')
        .select('id')
        .eq('plan_id', planId);

    if (bringItemsError) throw bringItemsError;

    const bringItemIds = (bringItems || []).map((item) => item.id);
    if (bringItemIds.length > 0) {
        const { error: upvoteDeleteError } = await supabase
            .from('plan_bring_item_upvotes')
            .delete()
            .in('item_id', bringItemIds);

        if (upvoteDeleteError) throw upvoteDeleteError;
    }

    const cleanupOperations = [
        supabase.from('plan_hype_shoutout_reactions').delete().eq('plan_id', planId),
        supabase.from('plan_hype_shoutouts').delete().eq('plan_id', planId),
        supabase.from('plan_hype_prediction_votes').delete().eq('plan_id', planId),
        supabase.from('plan_hype_show_votes').delete().eq('plan_id', planId),
        supabase.from('plan_hype_cancel_bets').delete().eq('plan_id', planId),
        supabase.from('plan_hype_outfits').delete().eq('plan_id', planId),
        supabase.from('plan_hype_settings').delete().eq('plan_id', planId),
        supabase.from('plan_bring_items').delete().eq('plan_id', planId),
        supabase.from('plan_rsvps').delete().eq('plan_id', planId),
        supabase.from('housie_games').update({ plan_id: null }).eq('plan_id', planId),
        supabase.from('blink_games').update({ plan_id: null }).eq('plan_id', planId),
    ];

    const cleanupResults = await Promise.all(cleanupOperations);
    const cleanupError = cleanupResults.find((result) => result.error)?.error;
    if (cleanupError) throw cleanupError;
}

async function findOrCreateActivity(
    groupId: string,
    userId: string,
    name: string
): Promise<{ id: string; name: string }> {
    const trimmed = name.trim();
    const { data: existing } = await supabase
        .from('plan_activities')
        .select('id, name')
        .eq('group_id', groupId)
        .ilike('name', trimmed)
        .maybeSingle();

    if (existing) return existing;

    const { data: created, error } = await supabase
        .from('plan_activities')
        .insert({
            group_id: groupId,
            name: trimmed,
            created_by: userId,
        })
        .select('id, name')
        .single();

    if (error) throw error;
    return created;
}

/**
 * GET /plans/activities?groupId=&q=
 */
router.get('/activities', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const groupId = req.query.groupId as string;
        const q = (req.query.q as string) || '';

        if (!groupId) {
            return res.status(400).json({ error: 'groupId is required' });
        }

        if (!(await assertGroupMember(groupId, userId))) {
            return res.status(403).json({ error: 'You are not a member of this group.' });
        }

        let query = supabase
            .from('plan_activities')
            .select('id, name, group_id, created_at')
            .eq('group_id', groupId)
            .order('name', { ascending: true });

        const term = q.trim();
        if (term) {
            query = query.ilike('name', `%${term}%`);
        }

        const { data: rows, error } = await query;
        if (error) throw error;

        const activities = (rows || []).map((row) => ({
            id: row.id,
            name: row.name,
        }));

        res.json({ activities });
    } catch (err: any) {
        console.error('[Plans] GET activities error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch activities' });
    }
});

/**
 * POST /plans/activities
 * Body: { groupId, name }
 */
router.post('/activities', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const { groupId, name } = req.body;
        const trimmed = typeof name === 'string' ? name.trim() : '';

        if (!groupId || !trimmed) {
            return res.status(400).json({ error: 'groupId and name are required' });
        }

        if (!(await assertGroupMember(groupId, userId))) {
            return res.status(403).json({ error: 'You are not a member of this group.' });
        }

        const activity = await findOrCreateActivity(groupId, userId, trimmed);

        res.status(201).json({ activity });
    } catch (err: any) {
        console.error('[Plans] POST activity error:', err);
        res.status(500).json({ error: err.message || 'Failed to create activity' });
    }
});

/**
 * POST /plans
 */
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const { groupId, activityId, activityLabel, activityName, startsAt, endsAt, location, placeId, placePhotoUrl, description } =
            req.body;

        if (!groupId || !startsAt) {
            return res.status(400).json({ error: 'groupId and startsAt are required' });
        }

        if (!(await assertGroupMember(groupId, userId))) {
            return res.status(403).json({ error: 'You are not a member of this group.' });
        }

        const starts = new Date(startsAt);
        if (Number.isNaN(starts.getTime())) {
            return res.status(400).json({ error: 'Invalid startsAt' });
        }
        if (starts <= new Date()) {
            return res.status(400).json({ error: 'Plan start time must be later than now.' });
        }

        const ends = resolveEndsAt(starts, endsAt);
        if (Number.isNaN(ends.getTime()) || ends <= starts) {
            return res.status(400).json({ error: 'Plan end time must be after the start time.' });
        }

        let resolvedActivityId = activityId as string | undefined;
        let label = typeof activityLabel === 'string' ? activityLabel.trim() : '';
        const nameFromBody = typeof activityName === 'string' ? activityName.trim() : '';

        if (!resolvedActivityId && nameFromBody) {
            const created = await findOrCreateActivity(groupId, userId, nameFromBody);
            resolvedActivityId = created.id;
            label = created.name;
        }

        if (!resolvedActivityId) {
            return res.status(400).json({ error: 'activityId or activityName is required' });
        }

        const { data: activityRow, error: activityError } = await supabase
            .from('plan_activities')
            .select('id, name, group_id')
            .eq('id', resolvedActivityId)
            .eq('group_id', groupId)
            .single();

        if (activityError || !activityRow) {
            return res.status(400).json({ error: 'Activity not found for this group' });
        }

        if (!label) label = activityRow.name;

        const insertPayload: Record<string, unknown> = {
            group_id: groupId,
            created_by: userId,
            activity_id: resolvedActivityId,
            activity_label: label,
            starts_at: starts.toISOString(),
            ends_at: ends.toISOString(),
            location: location ? String(location).trim() : null,
            status: computePlanStatus(starts, ends),
        };
        if (placeId) insertPayload.place_id = String(placeId);
        if (placePhotoUrl) insertPayload.place_photo_url = String(placePhotoUrl);
        if (description !== undefined) insertPayload.description = description ? String(description).trim() : null;

        const { data: plan, error } = await supabase
            .from('plans')
            .insert(insertPayload)
            .select(`
                *,
                group:group_id(id, name, description, cover_photo_url),
                creator:created_by(name, avatar_url)
            `)
            .single();

        if (error) throw error;

        await insertHostRsvp(plan.id, userId);
        sendPlanScheduledNotification(plan).catch((notificationError) => {
            console.error('[Plans] Failed to send scheduled plan notification:', notificationError);
        });

        const timeStr = new Date(starts).toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
        createGroupNotification(
            groupId,
            NOTIFICATION_TYPES.PLAN_CREATED,
            `${plan.creator?.name || 'A member'} created a plan "${label}"`,
            timeStr,
            userId,
            userId,
            plan.id
        );
        emitPlanUpdated(req, groupId, plan.id, 'created');

        const status = resolvePlanStatus(plan);
        const rsvpsMap = await loadRsvpsByPlanIds([plan.id]);
        const myRsvp = await loadMyRsvp(plan.id, userId);
        res.status(201).json({
            plan: formatPlanPayload(plan, status, userId, rsvpsMap[plan.id], myRsvp),
        });
    } catch (err: any) {
        console.error('[Plans] POST plan error:', err);
        res.status(500).json({ error: err.message || 'Failed to create plan' });
    }
});

/**
 * GET /plans?status=upcoming|live|past
 */
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const statusFilter = req.query.status as PlanStatus | undefined;

        const groupIds = await getUserGroupIds(userId);
        if (groupIds.length === 0) {
            return res.json({ plans: [] });
        }

        const { data: rows, error } = await supabase
            .from('plans')
            .select(`
                *,
                group:group_id(id, name, description, cover_photo_url),
                creator:created_by(name, avatar_url)
            `)
            .in('group_id', groupIds)
            .order('starts_at', { ascending: true });

        if (error) throw error;

        const planIds = (rows || []).map((r) => r.id);
        const rsvpsMap = await loadRsvpsByPlanIds(planIds);

        const now = new Date();
        const withStatus = (rows || []).map((row) => {
            const status = resolvePlanStatus(row, now);
            return formatPlanPayload(row, status, userId, rsvpsMap[row.id], null);
        });

        let filtered = withStatus;
        if (statusFilter && ['upcoming', 'live', 'past'].includes(statusFilter)) {
            filtered = withStatus.filter((p) => p.status === statusFilter);
        }

        filtered.sort((a, b) => {
            const aStart = new Date(a.startsAt).getTime();
            const bStart = new Date(b.startsAt).getTime();
            if (a.status === 'upcoming') return aStart - bStart;
            return bStart - aStart;
        });

        res.json({ plans: filtered });
    } catch (err: any) {
        console.error('[Plans] GET plans error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch plans' });
    }
});

/**
 * POST /plans/:id/rsvp — one RSVP per member (cannot change after submit)
 */
router.post('/:id/rsvp', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;
        const status = req.body?.status as PlanRsvpStatus;
        const note = typeof req.body?.note === 'string' ? req.body.note.trim() : null;

        if (!['going', 'maybe', 'cant_go'].includes(status)) {
            return res.status(400).json({ error: 'Invalid RSVP status' });
        }

        const { data: plan, error: planError } = await supabase
            .from('plans')
            .select('id, group_id, created_by, starts_at, ends_at, status')
            .eq('id', id)
            .single();

        if (planError || !plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        if (!(await assertGroupMember(plan.group_id, userId))) {
            return res.status(403).json({ error: 'You are not a member of this group.' });
        }

        const existing = await loadMyRsvp(id as string, userId);
        if (existing) {
            const { error: updateError } = await supabase
                .from('plan_rsvps')
                .update({
                    status,
                    note: note || null,
                })
                .eq('plan_id', id)
                .eq('user_id', userId);

            if (updateError) throw updateError;
        } else {
            const { error: insertError } = await supabase.from('plan_rsvps').insert({
                plan_id: id,
                user_id: userId,
                status,
                note: note || null,
            });

            if (insertError) throw insertError;
        }

        const rsvpsMap = await loadRsvpsByPlanIds([id as string]);
        const myRsvp = await loadMyRsvp(id as string, userId);
        const planStatus = resolvePlanStatus(plan);

        const { data: fullRow } = await supabase
            .from('plans')
            .select(`
                *,
                group:group_id(id, name, description, cover_photo_url),
                creator:created_by(name, avatar_url)
            `)
            .eq('id', id)
            .single();

        if (plan.created_by !== userId) {
            const { data: rsvper } = await supabase.from('users').select('name').eq('id', userId).single();
            const rsvperName = rsvper?.name || 'A member';
            let rsvpStatusStr = 'responded to';
            if (status === 'going') rsvpStatusStr = 'is going to';
            else if (status === 'maybe') rsvpStatusStr = 'might go to';
            else if (status === 'cant_go') rsvpStatusStr = "can't go to";

            createGroupNotification(
                plan.group_id,
                NOTIFICATION_TYPES.PLAN_RSVP,
                `New RSVP for ${fullRow?.title || 'Plan'}`,
                `${rsvperName} ${rsvpStatusStr} your plan`,
                plan.created_by,
                userId,
                plan.id
            );
        }

        const { count: memberCount } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', plan.group_id);

        emitPlanUpdated(req, plan.group_id, id as string, 'rsvp');

        res.json({
            plan: formatPlanPayload(fullRow || plan, planStatus, userId, rsvpsMap[id as string], myRsvp, memberCount),
        });
    } catch (err: any) {
        console.error('[Plans] POST rsvp error:', err);
        res.status(500).json({ error: err.message || 'Failed to save RSVP' });
    }
});

/**
 * POST /plans/:id/close — host ends a live plan and moves it to completed
 */
router.post('/:id/close', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;
        const nowIso = new Date().toISOString();

        const { data: plan, error: planError } = await supabase
            .from('plans')
            .select('id, created_by, group_id, status')
            .eq('id', id)
            .single();

        if (planError || !plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        if (plan.created_by !== userId) {
            return res.status(403).json({ error: 'Only the plan host can close this plan.' });
        }

        if (plan.status === 'past') {
            return res.status(400).json({ error: 'This plan is already completed.' });
        }

        const { data: updated, error: updateError } = await supabase
            .from('plans')
            .update({ status: 'past', ends_at: nowIso })
            .eq('id', id)
            .select(`
                *,
                group:group_id(id, name, description, cover_photo_url),
                creator:created_by(name, avatar_url)
            `)
            .single();

        if (updateError) throw updateError;
        emitPlanUpdated(req, plan.group_id, id as string, 'closed');

        const rsvpsMap = await loadRsvpsByPlanIds([id as string]);
        const myRsvp = await loadMyRsvp(id as string, userId);

        res.json({
            plan: formatPlanPayload(updated, 'past', userId, rsvpsMap[id as string], myRsvp),
        });
    } catch (err: any) {
        console.error('[Plans] POST complete plan error:', err);
        res.status(500).json({ error: err.message || 'Failed to complete plan' });
    }
});

/**
 * DELETE /plans/:id — host cancels plan
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const { data: plan, error: planError } = await supabase
            .from('plans')
            .select('id, activity_label, created_by, group_id')
            .eq('id', id)
            .maybeSingle();

        if (planError) {
            console.error('[Plans] DELETE plan lookup error:', planError);
            throw planError;
        }

        if (!plan) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        if (plan.created_by !== userId) {
            return res.status(403).json({ error: 'Only the plan host can cancel this plan.' });
        }

        await deletePlanDependents(id as string);

        const { error: deleteError } = await supabase.from('plans').delete().eq('id', id);

        if (deleteError) throw deleteError;
        emitPlanUpdated(req, plan.group_id, id as string, 'deleted');

        const { data: creator } = await supabase.from('users').select('name').eq('id', userId).single();
        const creatorName = creator?.name || 'The host';

        createGroupNotification(
            plan.group_id,
            NOTIFICATION_TYPES.PLAN_CANCELLED,
            `Plan Cancelled: ${plan.activity_label || 'Plan'}`,
            `${creatorName} cancelled the plan`,
            userId,
            userId,
            plan.id
        );

        res.json({ success: true });
    } catch (err: any) {
        console.error('[Plans] DELETE plan error:', err);
        res.status(500).json({ error: err.message || 'Failed to cancel plan' });
    }
});

/**
 * GET /plans/:id
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;
        const { id } = req.params;

        const { data: row, error } = await supabase
            .from('plans')
            .select(`
                *,
                group:group_id(id, name, description, cover_photo_url),
                creator:created_by(name, avatar_url)
            `)
            .eq('id', id)
            .single();

        if (error || !row) {
            return res.status(404).json({ error: 'Plan not found' });
        }

        if (!(await assertGroupMember(row.group_id, userId))) {
            return res.status(403).json({ error: 'You are not a member of this group.' });
        }

        const status = resolvePlanStatus(row);

        const rsvpsMap = await loadRsvpsByPlanIds([id as string]);
        const myRsvp = await loadMyRsvp(id as string, userId);

        const { count: memberCount } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', row.group_id);

        res.json({
            plan: formatPlanPayload(row, status, userId, rsvpsMap[id as string], myRsvp, memberCount),
        });
    } catch (err: any) {
        console.error('[Plans] GET plan error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch plan' });
    }
});


router.use('/:id/bring', planBringRoutes);
router.use('/:id/hype', planHypeRoutes);

export default router;
