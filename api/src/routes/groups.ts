import express from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { emitGroupEvent, GroupEventType } from '../sockets/groupEvents';
import { calculateMeetupStreak } from '../utils/pulse';
import { TimelineItem, TimelineItemType } from '../types/timeline';
import { sanitizeImageUrl } from '../utils/image';
import {
    actorFromUser,
    buildMilestoneItems,
    formatCurrency,
    getPrimaryImageUrl,
    getTimelineSubtitle,
    toTimelineItemType,
} from '../utils/timeline';

const router = express.Router();

// All group routes require authentication
router.use(authMiddleware);

// ──────────────────────────────────────────────
// POST /groups — Create a new group
// ──────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res) => {
    try {
        const { name, description, coverPhotoUrl } = req.body;
        const userId = req.userId!;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Group name is required' });
        }

        const sanitizedUrl = sanitizeImageUrl(coverPhotoUrl);
        console.log(`[Groups] 🆕 Creating group "${name}". Original:`, coverPhotoUrl, 'Sanitized:', sanitizedUrl);

        // Generate a unique 8-char invite code
        const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        // 1. Create the group
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .insert({
                name: name.trim(),
                description,
                cover_photo_url: sanitizedUrl,
                invite_code: inviteCode,
                admin_user_id: userId,
            })
            .select()
            .single();

        if (groupError) {
            console.error('[Groups] Create error:', groupError);
            return res.status(500).json({ error: 'Failed to create group' });
        }

        // 2. Add creator as admin member
        const { error: memberError } = await supabase
            .from('group_members')
            .insert({
                group_id: group.id,
                user_id: userId,
                role: 'admin',
            });

        if (memberError) {
            console.error('[Groups] Add admin member error:', memberError);
            await supabase.from('groups').delete().eq('id', group.id);
            return res.status(500).json({ error: 'Failed to add you as group admin' });
        }

        const io = req.app.get('io');
        emitGroupEvent(io, group.id, GroupEventType.GROUP_CREATED, group, [userId]);

        res.status(201).json({
            group,
            message: 'Group created successfully',
        });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// GET /groups — List all groups for current user
// ──────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;

        const { data: memberships, error: memberError } = await supabase
            .from('group_members')
            .select('group_id, role, last_seen_memories_at')
            .eq('user_id', userId);

        if (memberError) {
            console.error('[Groups] List memberships error:', memberError);
            return res.status(500).json({ error: 'Failed to fetch groups' });
        }

        if (!memberships || memberships.length === 0) {
            return res.json({ groups: [] });
        }

        const groupIds = memberships.map((m: any) => m.group_id);

        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*')
            .in('id', groupIds)
            .order('created_at', { ascending: false });

        if (groupsError) {
            console.error('[Groups] List groups error:', groupsError);
            return res.status(500).json({ error: 'Failed to fetch groups' });
        }

        const groupsWithMeta = await Promise.all(
            groups.map(async (group: any) => {
                const membership = memberships.find((m: any) => m.group_id === group.id);
                const lastSeenAt = membership?.last_seen_memories_at;

                // Build unseen memories query: uploaded by others, after last seen
                let unseenQuery = supabase
                    .from('memories')
                    .select('*', { count: 'exact', head: true })
                    .eq('group_id', group.id)
                    .eq('is_hidden', false)
                    .neq('user_id', userId);

                if (lastSeenAt) {
                    unseenQuery = unseenQuery.gt('created_at', lastSeenAt);
                }

                const [memberCountRes, winningsRes, memoryCountRes, unseenRes] = await Promise.all([
                    supabase
                        .from('group_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('group_id', group.id),
                    supabase
                        .from('game_results')
                        .select('prize_amount')
                        .eq('group_id', group.id)
                        .eq('user_id', userId),
                    supabase
                        .from('memories')
                        .select('*', { count: 'exact', head: true })
                        .eq('group_id', group.id)
                        .eq('is_hidden', false),
                    unseenQuery,
                ]);

                const totalWinnings = (winningsRes.data || []).reduce((acc: number, curr: any) => acc + (curr.prize_amount || 0), 0);

                return {
                    ...group,
                    memberCount: memberCountRes.count || 0,
                    myRole: membership?.role || 'member',
                    totalWinnings,
                    memoryCount: memoryCountRes.count || 0,
                    unseenCount: unseenRes.count || 0,
                    pulseScore: group.pulse_score ?? 0,
                    pulseRank: group.pulse_rank ?? 'Just Getting Started',
                };
            })
        );

        res.json({ groups: groupsWithMeta });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// GET /groups/:id — Get single group with members
// ──────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .eq('id', id)
            .single();

        if (groupError || !group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const { data: members } = await supabase
            .from('group_members')
            .select('id, role, joined_at, user_id, users(id, name, phone, avatar_url)')
            .eq('group_id', id)
            .order('joined_at', { ascending: true });

        res.json({
            group,
            members: members || [],
            myRole: membership.role,
        });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// GET /groups/:id/timeline — Unified group history feed
// ──────────────────────────────────────────────
router.get('/:id/timeline', async (req: AuthRequest, res) => {
    try {
        const id = req.params.id as string;
        const userId = req.userId!;
        const page = Math.max(0, parseInt(req.query.page as string, 10) || 0);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
        const sliceStart = page * limit;
        const sliceEnd = sliceStart + limit;
        const fetchLimit = Math.min(120, sliceEnd + 30);

        const { data: membership } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('id, name, created_at')
            .eq('id', id)
            .single();

        if (groupError || !group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const [{ data: blockedData }, { data: reportedData }] = await Promise.all([
            supabase
                .from('blocked_users')
                .select('blocked_id, blocker_id')
                .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
            supabase
                .from('reports')
                .select('content_id')
                .eq('reporter_id', userId),
        ]);

        const blockedUserIds = blockedData
            ? Array.from(new Set(blockedData.flatMap((b: any) => [b.blocked_id, b.blocker_id]))).filter((uid) => uid !== userId)
            : [];
        const reportedContentIds = reportedData?.map((r: any) => r.content_id) || [];

        let memoriesQuery = supabase
            .from('memories')
            .select('id, group_id, user_id, image_urls, story, memory_date, created_at, plan_id, user:users!user_id(id, name, avatar_url)')
            .eq('group_id', id)
            .eq('is_hidden', false)
            .order('memory_date', { ascending: false })
            .limit(fetchLimit);

        if (blockedUserIds.length > 0) {
            memoriesQuery = memoriesQuery.not('user_id', 'in', `(${blockedUserIds.join(',')})`);
        }

        if (reportedContentIds.length > 0) {
            memoriesQuery = memoriesQuery.not('id', 'in', `(${reportedContentIds.join(',')})`);
        }

        const [
            timelineEventsRes,
            plansRes,
            memoriesRes,
            expensesRes,
            settlementsRes,
            gameResultsRes,
            housieGamesRes,
            blinkGamesRes,
            milestonePlansRes,
            milestoneExpensesRes,
            milestoneMemoriesRes,
            milestoneHousieGamesRes,
            milestoneBlinkGamesRes,
        ] = await Promise.all([
            supabase
                .from('group_timeline_events')
                .select('id, source_type, source_id, occurred_at, title, subtitle, actor_id, metadata')
                .eq('group_id', id)
                .order('occurred_at', { ascending: false })
                .limit(fetchLimit),
            supabase
                .from('plans')
                .select('id, group_id, created_by, activity_label, status, starts_at, ends_at, created_at, location, place_photo_url, description, creator:users!created_by(id, name, avatar_url)')
                .eq('group_id', id)
                .order('starts_at', { ascending: false })
                .limit(fetchLimit),
            memoriesQuery,
            supabase
                .from('expenses')
                .select('id, group_id, description, amount, paid_by, added_by, expense_type, plan_id, created_at, payer:users!paid_by(id, name, avatar_url), adder:users!added_by(id, name, avatar_url), expense_participants(id, user_id, amount)')
                .eq('group_id', id)
                .order('created_at', { ascending: false })
                .limit(fetchLimit),
            supabase
                .from('settlements')
                .select('id, group_id, amount, from_user_id, to_user_id, plan_id, created_at, from:users!from_user_id(id, name, avatar_url), to:users!to_user_id(id, name, avatar_url)')
                .eq('group_id', id)
                .order('created_at', { ascending: false })
                .limit(fetchLimit),
            supabase
                .from('game_results')
                .select('id, game_id, group_id, user_id, prize_name, prize_amount, won_at, user:users!user_id(id, name, avatar_url)')
                .eq('group_id', id)
                .order('won_at', { ascending: false })
                .limit(fetchLimit),
            supabase
                .from('housie_games')
                .select('id, game_code, title, status, scheduled_at, created_at, group_id')
                .eq('group_id', id)
                .order('created_at', { ascending: false })
                .limit(fetchLimit),
            supabase
                .from('blink_games')
                .select('id, game_code, title, status, scheduled_at, created_at, group_id')
                .eq('group_id', id)
                .order('created_at', { ascending: false })
                .limit(fetchLimit),
            supabase
                .from('plans')
                .select('id, status, starts_at, ends_at, created_at')
                .eq('group_id', id)
                .order('starts_at', { ascending: true })
                .limit(500),
            supabase
                .from('expenses')
                .select('id, amount, created_at')
                .eq('group_id', id)
                .order('created_at', { ascending: true })
                .limit(1000),
            supabase
                .from('memories')
                .select('id, user_id, memory_date, created_at')
                .eq('group_id', id)
                .eq('is_hidden', false)
                .order('memory_date', { ascending: true })
                .limit(1000),
            supabase
                .from('housie_games')
                .select('id, scheduled_at, created_at')
                .eq('group_id', id)
                .order('created_at', { ascending: true })
                .limit(500),
            supabase
                .from('blink_games')
                .select('id, scheduled_at, created_at')
                .eq('group_id', id)
                .order('created_at', { ascending: true })
                .limit(500),
        ]);

        const sourceError = [
            timelineEventsRes.error,
            plansRes.error,
            memoriesRes.error,
            expensesRes.error,
            settlementsRes.error,
            gameResultsRes.error,
            housieGamesRes.error,
            blinkGamesRes.error,
            milestonePlansRes.error,
            milestoneExpensesRes.error,
            milestoneMemoriesRes.error,
            milestoneHousieGamesRes.error,
            milestoneBlinkGamesRes.error,
        ].find(Boolean);

        if (sourceError) throw sourceError;

        const planIds = (plansRes.data || []).map((plan: any) => plan.id);
        const { data: planRsvps, error: planRsvpsError } = planIds.length > 0
            ? await supabase
                .from('plan_rsvps')
                .select('plan_id, user_id, status, note, created_at, user:users!user_id(id, name, avatar_url)')
                .in('plan_id', planIds)
            : { data: [], error: null };

        if (planRsvpsError) throw planRsvpsError;

        const rsvpsByPlanId = (planRsvps || []).reduce((acc: Record<string, any[]>, rsvp: any) => {
            if (!acc[rsvp.plan_id]) acc[rsvp.plan_id] = [];
            acc[rsvp.plan_id].push(rsvp);
            return acc;
        }, {});

        const housieById = new Map((housieGamesRes.data || []).map((game: any) => [game.id, game]));
        const blinkById = new Map((blinkGamesRes.data || []).map((game: any) => [game.id, game]));

        const persistedItems: TimelineItem[] = (timelineEventsRes.data || []).flatMap((event: any) => {
            const type = toTimelineItemType(event.source_type);
            if (!type) return [];

            return [{
                id: event.id,
                type,
                occurredAt: event.occurred_at,
                title: event.title,
                subtitle: event.subtitle,
                groupId: id,
                actor: event.actor_id ? { id: event.actor_id, name: 'Member', avatarUrl: null } : null,
                metadata: {
                    ...(event.metadata || {}),
                    sourceId: event.source_id,
                    persisted: true,
                },
            }];
        });

        const planItems: TimelineItem[] = (plansRes.data || []).map((plan: any) => {
            const rsvps = rsvpsByPlanId[plan.id] || [];
            const going = rsvps.filter((rsvp) => rsvp.status === 'going');
            const occurredAt = plan.starts_at || plan.created_at;
            return {
                id: `plan:${plan.id}`,
                type: 'plan',
                occurredAt,
                title: plan.status === 'past' ? `${plan.activity_label || 'Plan'} happened` : `${plan.activity_label || 'Plan'} planned`,
                subtitle: getTimelineSubtitle([
                    going.length > 0 ? `${going.length} going` : null,
                    plan.location,
                    plan.status,
                ]),
                groupId: id,
                actor: actorFromUser(plan.created_by, plan.creator),
                metadata: {
                    planId: plan.id,
                    status: plan.status,
                    startsAt: plan.starts_at,
                    endsAt: plan.ends_at,
                    location: plan.location,
                    placePhotoUrl: plan.place_photo_url,
                    description: plan.description,
                    goingCount: going.length,
                    rsvpCount: rsvps.length,
                    going: going.slice(0, 8).map((rsvp: any) => ({
                        userId: rsvp.user_id,
                        name: rsvp.user?.name || 'Member',
                        avatarUrl: rsvp.user?.avatar_url ?? null,
                    })),
                },
            };
        });

        const memoryItems: TimelineItem[] = (memoriesRes.data || []).map((memory: any) => {
            const imageCount = Array.isArray(memory.image_urls) ? memory.image_urls.length : 0;
            return {
                id: `memory:${memory.id}`,
                type: 'memory',
                occurredAt: memory.memory_date || memory.created_at,
                title: imageCount > 1 ? `${imageCount} memories added` : 'Memory added',
                subtitle: memory.story || `${memory.user?.name || 'A member'} shared a moment`,
                groupId: id,
                actor: actorFromUser(memory.user_id, memory.user),
                metadata: {
                    memoryId: memory.id,
                    planId: memory.plan_id,
                    imageUrls: memory.image_urls || [],
                    thumbnailUrl: getPrimaryImageUrl(memory.image_urls),
                    imageCount,
                    story: memory.story,
                },
            };
        });

        const expenseItems: TimelineItem[] = (expensesRes.data || []).map((expense: any) => {
            const participantCount = Array.isArray(expense.expense_participants) ? expense.expense_participants.length : 0;
            return {
                id: `expense:${expense.id}`,
                type: 'expense',
                occurredAt: expense.created_at,
                title: `${formatCurrency(expense.amount)} split`,
                subtitle: getTimelineSubtitle([
                    expense.description || 'Hisaab expense',
                    participantCount > 0 ? `${participantCount} members` : null,
                ]),
                groupId: id,
                actor: actorFromUser(expense.added_by || expense.paid_by, expense.adder || expense.payer),
                metadata: {
                    expenseId: expense.id,
                    planId: expense.plan_id,
                    description: expense.description,
                    amount: Number(expense.amount || 0),
                    paidBy: expense.paid_by,
                    paidByName: expense.payer?.name || 'Member',
                    participantCount,
                    expenseType: expense.expense_type,
                },
            };
        });

        const settlementItems: TimelineItem[] = (settlementsRes.data || []).map((settlement: any) => ({
            id: `settlement:${settlement.id}`,
            type: 'settlement',
            occurredAt: settlement.created_at,
            title: `${formatCurrency(settlement.amount)} settled`,
            subtitle: `${settlement.from?.name || 'A member'} paid ${settlement.to?.name || 'a member'}`,
            groupId: id,
            actor: actorFromUser(settlement.from_user_id, settlement.from),
            metadata: {
                settlementId: settlement.id,
                planId: settlement.plan_id,
                amount: Number(settlement.amount || 0),
                fromUserId: settlement.from_user_id,
                fromName: settlement.from?.name || 'Member',
                toUserId: settlement.to_user_id,
                toName: settlement.to?.name || 'Member',
            },
        }));

        const gameResultItems: TimelineItem[] = (gameResultsRes.data || []).map((result: any) => {
            const housieGame = housieById.get(result.game_id) as any;
            const blinkGame = blinkById.get(result.game_id) as any;
            const game = housieGame || blinkGame;
            const type: TimelineItemType = blinkGame ? 'blink_result' : 'housie_result';
            const gameName = blinkGame ? 'Blink' : 'Housie';
            return {
                id: `${type}:${result.id}`,
                type,
                occurredAt: result.won_at,
                title: `${result.user?.name || 'A member'} won ${result.prize_name || gameName}`,
                subtitle: getTimelineSubtitle([
                    game?.title || gameName,
                    Number(result.prize_amount || 0) > 0 ? `${formatCurrency(result.prize_amount)} prize` : null,
                ]),
                groupId: id,
                actor: actorFromUser(result.user_id, result.user),
                metadata: {
                    resultId: result.id,
                    gameId: result.game_id,
                    gameCode: game?.game_code,
                    gameTitle: game?.title,
                    gameType: blinkGame ? 'blink' : 'housie',
                    prizeName: result.prize_name,
                    prizeAmount: Number(result.prize_amount || 0),
                },
            };
        });

        const completedPlans = (milestonePlansRes.data || []).filter((plan: any) => {
            const planTime = new Date(plan.ends_at || plan.starts_at || plan.created_at).getTime();
            return plan.status === 'past' || planTime < Date.now();
        });
        const injectedMilestones = buildMilestoneItems(id, group, {
            completedPlans,
            expenses: milestoneExpensesRes.data || [],
            memories: milestoneMemoriesRes.data || [],
            games: [
                ...(milestoneHousieGamesRes.data || []),
                ...(milestoneBlinkGamesRes.data || []),
            ],
        });

        const items = [
            ...persistedItems,
            ...planItems,
            ...memoryItems,
            ...expenseItems,
            ...settlementItems,
            ...gameResultItems,
            ...injectedMilestones,
        ]
            .filter((item) => item.occurredAt)
            .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

        const pageItems = items.slice(sliceStart, sliceEnd);

        res.json({
            items: pageItems,
            page,
            hasMore: items.length > sliceEnd,
        });
    } catch (err: any) {
        console.error('[Groups] Timeline error:', err);
        res.status(500).json({ error: err.message || 'Failed to fetch group timeline' });
    }
});

// ──────────────────────────────────────────────
// POST /groups/:id/seen-memories — Mark memories as seen
// ──────────────────────────────────────────────
router.post('/:id/seen-memories', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        const { error } = await supabase
            .from('group_members')
            .update({ last_seen_memories_at: new Date().toISOString() })
            .eq('group_id', id)
            .eq('user_id', userId);

        if (error) {
            console.error('[Groups] Mark seen error:', error);
            return res.status(500).json({ error: 'Failed to mark memories as seen' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// GET /groups/:id/blink-games — List Blink games for group
// ──────────────────────────────────────────────
router.get('/:id/blink-games', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        const { data: membership } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { data: games, error } = await supabase
            .from('blink_games')
            .select('*, host:users!host_id(name, avatar_url)')
            .eq('group_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ games });
    } catch (error: any) {
        console.error('[Groups] List Blink Games Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ──────────────────────────────────────────────
// POST /groups/join — Join a group via invite code
// ──────────────────────────────────────────────
router.post('/join', async (req: AuthRequest, res) => {
    try {
        const { inviteCode } = req.body;
        const userId = req.userId!;

        if (!inviteCode || !inviteCode.trim()) {
            return res.status(400).json({ error: 'Invite code is required' });
        }

        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .eq('invite_code', inviteCode.trim().toUpperCase())
            .single();

        if (groupError || !group) {
            return res.status(404).json({ error: 'Invalid invite code. No group found.' });
        }

        const { data: existing } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', group.id)
            .eq('user_id', userId)
            .single();

        if (existing) {
            return res.status(409).json({ error: 'You are already a member of this group', group });
        }

        const { error: joinError } = await supabase
            .from('group_members')
            .insert({
                group_id: group.id,
                user_id: userId,
                role: 'member',
            });

        if (joinError) {
            console.error('[Groups] Join error:', joinError);
            return res.status(500).json({ error: 'Failed to join group' });
        }

        const io = req.app.get('io');
        emitGroupEvent(io, group.id, GroupEventType.MEMBER_JOINED, { userId }, [userId]);

        res.json({ group, message: 'Joined group successfully' });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// PATCH /groups/:id — Update group (Admin Only)
// ──────────────────────────────────────────────
router.patch('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { name, description, coverPhotoUrl } = req.body;
        const userId = req.userId!;

        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can update group settings' });
        }

        const updates: any = {};
        if (name) updates.name = name.trim();
        if (description !== undefined) updates.description = description;
        if (coverPhotoUrl !== undefined) {
            const sanitizedUrl = sanitizeImageUrl(coverPhotoUrl);
            console.log(`[Groups] 🔄 Updating group ${id}. Original:`, coverPhotoUrl, 'Sanitized:', sanitizedUrl);
            updates.cover_photo_url = sanitizedUrl;
        }

        const { data: group, error: updateError } = await supabase
            .from('groups')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('[Groups] Update error:', updateError);
            return res.status(500).json({ error: 'Failed to update group' });
        }

        const io = req.app.get('io');
        emitGroupEvent(io, id as string, GroupEventType.GROUP_UPDATED, group, [userId]);

        res.json({ group, message: 'Group updated successfully' });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// DELETE /groups/:id — Delete group (Admin Only)
// ──────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can delete groups' });
        }

        const { error: deleteError } = await supabase
            .from('groups')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('[Groups] Delete error:', deleteError);
            return res.status(500).json({ error: 'Failed to delete group' });
        }

        res.json({ message: 'Group permanently deleted' });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// POST /groups/:id/leave — Leave a group
// ──────────────────────────────────────────────
router.post('/:id/leave', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(404).json({ error: 'Membership not found' });
        }

        if (membership.role === 'admin') {
            const { count } = await supabase
                .from('group_members')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', id);

            if (count && count > 1) {
                return res.status(400).json({
                    error: 'Please transfer ownership to another member before leaving the group.'
                });
            }
        }

        const { error: leaveError } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', id)
            .eq('user_id', userId);

        if (leaveError) {
            console.error('[Groups] Leave error:', leaveError);
            return res.status(500).json({ error: 'Failed to leave group' });
        }

        const io = req.app.get('io');
        emitGroupEvent(io, id as string, GroupEventType.MEMBER_LEFT, { userId }, [userId]);

        res.json({ message: 'Successfully left the group' });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// POST /groups/:id/transfer-ownership — Transfer Admin Role
// ──────────────────────────────────────────────
router.post('/:id/transfer-ownership', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { newAdminUserId } = req.body;
        const userId = req.userId!;

        if (!newAdminUserId) {
            return res.status(400).json({ error: 'Target member ID is required for transfer' });
        }

        const { data: myMembership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!myMembership || myMembership.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can transfer ownership' });
        }

        const { data: targetMembership } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', id)
            .eq('user_id', newAdminUserId)
            .single();

        await Promise.all([
            supabase.from('group_members').update({ role: 'admin' }).eq('group_id', id).eq('user_id', newAdminUserId),
            supabase.from('group_members').update({ role: 'member' }).eq('group_id', id).eq('user_id', userId),
            supabase.from('groups').update({ admin_user_id: newAdminUserId }).eq('id', id)
        ]);

        const io = req.app.get('io');
        emitGroupEvent(io, id as string, GroupEventType.MEMBERSHIP_CHANGED, { newAdminUserId }, [userId, newAdminUserId]);

        res.json({ message: 'Ownership transferred successfully' });
    } catch (err) {
        console.error('[Groups] Transfer error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// GET /groups/:id/pulse — Get Group Pulse Details
// ──────────────────────────────────────────────
router.get('/:id/pulse', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        // 1. Verify membership
        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Fetch stored pulse values and member count to validate pulse availability.
        const [groupRes, membersCountRes] = await Promise.all([
            supabase
                .from('groups')
                .select('created_at, pulse_score, pulse_rank, pulse_delta, pulse_percentile, pulse_leaderboard_rank, pulse_leaderboard_total, pulse_last_calculated_at')
                .eq('id', id)
                .single(),
            supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', id)
        ]);

        if (groupRes.error || !groupRes.data) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const now = new Date();
        const createdAt = new Date(groupRes.data.created_at);
        const ageInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const memberCount = membersCountRes.count || 0;

        if (ageInDays < 7 || memberCount <= 1) {
            return res.status(403).json({
                error: 'Group Pulse is not available for groups less than 7 days old or with 1 member.'
            });
        }

        const group = groupRes.data;
        const pulseScore = group.pulse_score ?? 0;
        const pulseDelta = group.pulse_delta ?? 0;
        const pulseRank = group.pulse_rank ?? 'Just Getting Started';
        const pulsePercentile = group.pulse_percentile ?? 0;
        const pulseLeaderboardRank = group.pulse_leaderboard_rank ?? null;
        const pulseLeaderboardTotal = group.pulse_leaderboard_total ?? 0;

        const groupId = id as string;
        const { data: plans } = await supabase
            .from('plans')
            .select('id, starts_at, status, created_at')
            .eq('group_id', groupId)
            .neq('status', 'cancelled');

        const planIds = (plans || []).map((p: any) => p.id);
        let planRsvps: any[] = [];
        if (planIds.length > 0) {
            const { data: rsvps } = await supabase
                .from('plan_rsvps')
                .select('plan_id, user_id, status, created_at')
                .in('plan_id', planIds);
            planRsvps = rsvps || [];
        }

        const { data: games } = await supabase
            .from('blink_games')
            .select('id, created_at')
            .eq('group_id', groupId);

        const { data: memories } = await supabase
            .from('memories')
            .select('id, created_at')
            .eq('group_id', groupId)
            .eq('is_hidden', false);

        // 2. Streak Count (Consecutive weekends/weeks with meetups)
        const pastPlans = (plans || []).filter((p: any) => p.status === 'past' || new Date(p.starts_at).getTime() < now.getTime());
        const streakCount = calculateMeetupStreak(pastPlans);

        // 3. Monthly overview metrics (last 30 days)
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        const plansCreatedLast30d = (plans || []).filter((p: any) => new Date(p.created_at || p.starts_at).getTime() >= thirtyDaysAgo).length;
        const memoriesSharedLast30d = (memories || []).filter((m: any) => new Date(m.created_at).getTime() >= thirtyDaysAgo).length;
        const gamesPlayedLast30d = (games || []).filter((g: any) => new Date(g.created_at).getTime() >= thirtyDaysAgo).length;

        // Settlements in last 30 days
        const { data: settlements } = await supabase
            .from('settlements')
            .select('amount, created_at')
            .eq('group_id', id);

        const settlementsLast30d = (settlements || [])
            .filter((s: any) => new Date(s.created_at).getTime() >= thirtyDaysAgo)
            .reduce((sum: number, s: any) => sum + (s.amount || 0), 0);

        const hisaabSettled = '₹' + settlementsLast30d.toLocaleString('en-IN');

        // 4. Recent plan participation
        // Find the most recent past plan to show participation details
        let joinedMembers = 0;
        let totalMembers = memberCount;
        let joinedPercent = 0;

        let pastPlansSorted: any[] = [];
        if (pastPlans.length > 0) {
            // Sort past plans descending by starts_at to get the most recent
            pastPlansSorted = [...pastPlans].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
            const mostRecentPlan = pastPlansSorted[0];
            const recentPlanRsvps = planRsvps.filter((r: any) => r.plan_id === mostRecentPlan.id && r.status === 'going');
            joinedMembers = recentPlanRsvps.length;
            joinedPercent = totalMembers > 0 ? Math.round((joinedMembers / totalMembers) * 100) : 0;
        }

        res.json({
            pulseScore,
            pulseDelta,
            pulseRank,
            pulsePercentile,
            pulseLeaderboardRank,
            pulseLeaderboardTotal,
            joinedMembers,
            totalMembers,
            joinedPercent,
            streakCount,
            pastPlans: pastPlansSorted,
            plansCreated: plansCreatedLast30d,
            totalMemories: memoriesSharedLast30d,
            gamesPlayed: gamesPlayedLast30d,
            hisaabSettled,
            pulseLastCalculatedAt: group.pulse_last_calculated_at
        });
    } catch (err) {
        console.error('[Groups] Pulse details error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
