import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/** Starter labels for new groups; stored in plan_activities like any other entry */
const DEFAULT_ACTIVITY_NAMES = ['Kitty', 'Get-together'];

const PLAN_DURATION_MS = 3 * 60 * 60 * 1000;

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

async function ensureDefaultActivities(groupId: string, userId: string): Promise<void> {
    const { count, error: countError } = await supabase
        .from('plan_activities')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', groupId);

    if (countError) throw countError;
    if ((count ?? 0) > 0) return;

    const rows = DEFAULT_ACTIVITY_NAMES.map((name) => ({
        group_id: groupId,
        name,
        created_by: userId,
    }));

    const { error } = await supabase.from('plan_activities').insert(rows);
    if (error) throw error;
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

        if (!q.trim()) {
            await ensureDefaultActivities(groupId, userId);
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
        const { groupId, activityId, activityLabel, activityName, startsAt, endsAt, location } =
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

        const ends = resolveEndsAt(starts, endsAt);

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

        const { data: plan, error } = await supabase
            .from('plans')
            .insert({
                group_id: groupId,
                created_by: userId,
                activity_id: resolvedActivityId,
                activity_label: label,
                starts_at: starts.toISOString(),
                ends_at: ends.toISOString(),
                location: location ? String(location).trim() : null,
            })
            .select(`
                *,
                group:group_id(id, name)
            `)
            .single();

        if (error) throw error;

        const status = computePlanStatus(starts, ends);
        res.status(201).json({
            plan: {
                id: plan.id,
                groupId: plan.group_id,
                groupName: (plan as any).group?.name,
                activityId: plan.activity_id,
                activityLabel: plan.activity_label,
                startsAt: plan.starts_at,
                endsAt: plan.ends_at,
                location: plan.location,
                status,
            },
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
                group:group_id(id, name),
                creator:created_by(name, avatar_url)
            `)
            .in('group_id', groupIds)
            .order('starts_at', { ascending: true });

        if (error) throw error;

        const now = new Date();
        const withStatus = (rows || []).map((row) => {
            const startsAt = new Date(row.starts_at);
            const endsAt = new Date(row.ends_at);
            const status = computePlanStatus(startsAt, endsAt, now);
            return {
                id: row.id,
                groupId: row.group_id,
                groupName: (row as any).group?.name || 'Mandali',
                activityId: row.activity_id,
                activityLabel: row.activity_label,
                startsAt: row.starts_at,
                endsAt: row.ends_at,
                location: row.location,
                createdBy: row.created_by,
                creatorName: (row as any).creator?.name,
                status,
            };
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
                group:group_id(id, name),
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

        const startsAt = new Date(row.starts_at);
        const endsAt = new Date(row.ends_at);
        const status = computePlanStatus(startsAt, endsAt);

        res.json({
            plan: {
                id: row.id,
                groupId: row.group_id,
                groupName: (row as any).group?.name,
                activityId: row.activity_id,
                activityLabel: row.activity_label,
                startsAt: row.starts_at,
                endsAt: row.ends_at,
                location: row.location,
                createdBy: row.created_by,
                creatorName: (row as any).creator?.name,
                status,
            },
        });
    } catch (err: any) {
        console.error('[Plans] GET plan error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch plan' });
    }
});

export default router;
