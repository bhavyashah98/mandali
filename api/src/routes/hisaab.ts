import express from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// All hisaab routes require authentication
router.use(authMiddleware);

// ──────────────────────────────────────────────
// GET /hisaab/balances — Get user's net balances across all groups
// ──────────────────────────────────────────────
router.get('/balances', async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;

        const { data, error } = await supabase.rpc('get_user_group_balances', {
            p_user_id: userId
        });

        if (error) {
            console.error('[Hisaab] Get balances error:', error);
            return res.status(500).json({ error: 'Failed to fetch balances' });
        }

        res.json({ balances: data || [] });
    } catch (err) {
        console.error('[Hisaab] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// GET /hisaab/ledger/:groupId — Get group's expense ledger
// ──────────────────────────────────────────────
router.get('/ledger/:groupId', async (req: AuthRequest, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId!;

        // 1. Verify membership
        const { data: membership } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // 2. Fetch ledger
        const { data: expenses, error } = await supabase
            .from('expenses')
            .select(`
                *,
                profiles:paid_by (full_name),
                expense_participants (
                    user_id,
                    amount,
                    profiles:user_id (full_name)
                )
            `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Hisaab] Get ledger error:', error);
            return res.status(500).json({ error: 'Failed to fetch ledger' });
        }

        // Formatting for frontend compatibility
        const ledger = expenses.map((e: any) => ({
            id: e.id,
            groupId: e.group_id,
            description: e.description,
            amount: e.amount,
            paidBy: e.paid_by,
            paidByName: e.profiles?.full_name || 'Unknown',
            type: e.type,
            createdAt: e.created_at,
            participants: e.expense_participants.map((p: any) => ({
                userId: p.user_id,
                amount: p.amount,
                userName: p.profiles?.full_name
            }))
        }));

        res.json({ ledger });
    } catch (err) {
        console.error('[Hisaab] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// GET /hisaab/members/:groupId — Get members for split selection
// ──────────────────────────────────────────────
router.get('/members/:groupId', async (req: AuthRequest, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId!;

        const { data: members, error } = await supabase
            .from('group_members')
            .select('user_id, profiles(full_name)')
            .eq('group_id', groupId);

        if (error) {
            console.error('[Hisaab] Get members error:', error);
            return res.status(500).json({ error: 'Failed to fetch members' });
        }

        // Optional: Get peer-to-peer balances if requested
        const { data: balancesData } = await supabase.rpc('get_group_member_balances', {
            p_group_id: groupId,
            p_user_id: userId
        });

        const formattedMembers = members.map((m: any) => {
            const balanceData = (balancesData || []).find((b: any) => b.user_id === m.user_id);
            return {
                id: m.user_id,
                name: m.profiles?.full_name || 'Unknown',
                balance: balanceData?.balance || 0
            };
        });

        res.json({ members: formattedMembers });
    } catch (err) {
        console.error('[Hisaab] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// POST /hisaab/expense — Add a new expense
// ──────────────────────────────────────────────
router.post('/expense', async (req: AuthRequest, res) => {
    try {
        const { groupId, description, amount, participants, type = 'expense' } = req.body;
        const userId = req.userId!;

        if (!groupId || !amount || !participants || !participants.length) {
            return res.status(400).json({ error: 'Missing required expense fields' });
        }

        // 1. Insert main expense
        const { data: expense, error: expError } = await supabase
            .from('expenses')
            .insert({
                group_id: groupId,
                description,
                amount,
                paid_by: userId,
                type
            })
            .select()
            .single();

        if (expError) {
            console.error('[Hisaab] Expense creation error:', expError);
            return res.status(500).json({ error: 'Failed to create expense' });
        }

        // 2. Insert participants (splits)
        const participantsToInsert = participants.map((p: any) => ({
            expense_id: expense.id,
            user_id: p.userId,
            amount: p.amount
        }));

        const { error: partError } = await supabase
            .from('expense_participants')
            .insert(participantsToInsert);

        if (partError) {
            console.error('[Hisaab] Expense participants creation error:', partError);
            // Cleanup main expense
            await supabase.from('expenses').delete().eq('id', expense.id);
            return res.status(500).json({ error: 'Failed to add participants' });
        }

        res.status(201).json({ expense, message: 'Expense recorded successfully' });
    } catch (err) {
        console.error('[Hisaab] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// POST /hisaab/settle — Record a settlement
// ──────────────────────────────────────────────
router.post('/settle', async (req: AuthRequest, res) => {
    try {
        const { groupId, toUserId, amount } = req.body;
        const userId = req.userId!;

        if (!groupId || !toUserId || !amount) {
            return res.status(400).json({ error: 'Missing settlement details' });
        }

        // Settlement is just a special case of expense
        const { data: expense, error: expError } = await supabase
            .from('expenses')
            .insert({
                group_id: groupId,
                description: 'Settlement',
                amount,
                paid_by: userId,
                type: 'settlement'
            })
            .select()
            .single();

        if (expError) {
            console.error('[Hisaab] Settlement record error:', expError);
            return res.status(500).json({ error: 'Failed to record settlement' });
        }

        const { error: partError } = await supabase
            .from('expense_participants')
            .insert({
                expense_id: expense.id,
                user_id: toUserId,
                amount
            });

        if (partError) {
            console.error('[Hisaab] Settlement participant record error:', partError);
            await supabase.from('expenses').delete().eq('id', expense.id);
            return res.status(500).json({ error: 'Failed to link settlement profile' });
        }

        res.status(201).json({ message: 'Balance settled successfully' });
    } catch (err) {
        console.error('[Hisaab] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
