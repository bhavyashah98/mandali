import express from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authMiddleware);

// Helper function: Simplify Debts (Greedy Algorithm)
// Minimizes the number of transactions required to settle up
const simplifyDebts = (balances: { [userId: string]: number }) => {
    const debtors = Object.keys(balances)
        .filter(id => balances[id] < -0.01)
        .map(id => ({ id, amount: Math.abs(balances[id]) }))
        .sort((a, b) => b.amount - a.amount);

    const creditors = Object.keys(balances)
        .filter(id => balances[id] > 0.01)
        .map(id => ({ id, amount: balances[id] }))
        .sort((a, b) => b.amount - a.amount);

    const transactions: { from: string; to: string; amount: number }[] = [];

    let d = 0, c = 0;
    while (d < debtors.length && c < creditors.length) {
        const amount = Math.min(debtors[d].amount, creditors[c].amount);
        transactions.push({
            from: debtors[d].id,
            to: creditors[c].id,
            amount: Number(amount.toFixed(2))
        });

        debtors[d].amount -= amount;
        creditors[c].amount -= amount;

        if (debtors[d].amount < 0.01) d++;
        if (creditors[c].amount < 0.01) c++;
    }

    return transactions;
};

// ──────────────────────────────────────────────
// GET /hisaab/balances — Get user's net balances across all groups
// ──────────────────────────────────────────────
router.get('/balances', async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;

        const { data: memberships } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', userId);

        if (!memberships || memberships.length === 0) return res.json({ balances: [] });
        const groupIds = memberships.map(m => m.group_id);

        // Fetch all 3 tables for these groups
        // We use expenses!inner(group_id) to ensure we can map participants back to their groups
        const [expensesRes, partRes, settledRes] = await Promise.all([
            supabase.from('expenses').select('group_id, amount, paid_by, created_at').in('group_id', groupIds),
            supabase.from('expense_participants').select('amount, expenses!inner(group_id)').eq('user_id', userId),
            supabase.from('settlements').select('group_id, amount, from_user_id, to_user_id').or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`).in('group_id', groupIds)
        ]);

        const groupStats: { [key: string]: { netBalance: number; lastActivity: string } } = {};
        groupIds.forEach(gid => { groupStats[gid] = { netBalance: 0, lastActivity: '' }; });

        // 1. Expenses I Paid (+)
        expensesRes.data?.forEach(e => {
            if (e.paid_by === userId) groupStats[e.group_id].netBalance += Number(e.amount);
            if (!groupStats[e.group_id].lastActivity || new Date(e.created_at) > new Date(groupStats[e.group_id].lastActivity)) {
                groupStats[e.group_id].lastActivity = e.created_at;
            }
        });

        // 2. My Share in Expenses (-)
        partRes.data?.forEach((p: any) => {
            const gid = p.expenses?.group_id;
            if (gid && groupStats[gid]) groupStats[gid].netBalance -= Number(p.amount);
        });

        // 3. Settlements Received (+) and Paid (-)
        settledRes.data?.forEach(s => {
            if (s.to_user_id === userId) groupStats[s.group_id].netBalance += Number(s.amount);
            if (s.from_user_id === userId) groupStats[s.group_id].netBalance -= Number(s.amount);
        });

        const balances = Object.keys(groupStats).map(gid => ({
            groupId: gid,
            netBalance: Number(groupStats[gid].netBalance.toFixed(2)),
            lastActivity: groupStats[gid].lastActivity || null
        }));

        res.json({ balances });
    } catch (err) {
        console.error('[Hisaab] Balances error:', err);
        res.status(500).json({ error: 'Failed to fetch balances' });
    }
});

// ──────────────────────────────────────────────
// GET /hisaab/ledger/:groupId — Get group's mixed ledger
// ──────────────────────────────────────────────
router.get('/ledger/:groupId', async (req: AuthRequest, res) => {
    try {
        const { groupId } = req.params;
        const [expensesRes, settledRes] = await Promise.all([
            supabase
                .from('expenses')
                .select('*, users:paid_by(name), expense_participants(*, users:user_id(name))')
                .eq('group_id', groupId),
            supabase
                .from('settlements')
                .select('*, from:from_user_id(name), to:to_user_id(name)')
                .eq('group_id', groupId)
        ]);

        const ledger: any[] = [];

        expensesRes.data?.forEach(e => {
            ledger.push({
                id: e.id,
                description: e.description,
                amount: e.amount,
                paidBy: e.paid_by,
                paidByName: (e.users as any)?.name || 'Unknown',
                type: 'expense',
                createdAt: e.created_at,
                participants: e.expense_participants.map((p: any) => ({
                    userId: p.user_id,
                    amount: p.amount,
                    userName: p.users?.name
                }))
            });
        });

        settledRes.data?.forEach(s => {
            ledger.push({
                id: s.id,
                description: 'Settlement',
                amount: s.amount,
                paidBy: s.from_user_id,
                paidByName: (s.from as any)?.name,
                toUserId: s.to_user_id,
                toUserName: (s.to as any)?.name,
                type: 'settlement',
                createdAt: s.created_at,
                participants: []
            });
        });

        ledger.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ ledger });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch ledger' });
    }
});

// ──────────────────────────────────────────────
// GET /hisaab/members/:groupId — Pairwise & Simplified Balances
// ──────────────────────────────────────────────
router.get('/members/:groupId', async (req: AuthRequest, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId!;

        const [membersRes, expensesRes, settledRes] = await Promise.all([
            supabase.from('group_members').select('user_id, users(name)').eq('group_id', groupId),
            supabase.from('expenses').select('paid_by, amount, expense_participants(user_id, amount)').eq('group_id', groupId),
            supabase.from('settlements').select('from_user_id, to_user_id, amount').eq('group_id', groupId)
        ]);

        const members = membersRes.data || [];
        const netBalances: { [key: string]: number } = {};
        members.forEach(m => netBalances[m.user_id] = 0);

        // 1. Process Expenses
        expensesRes.data?.forEach(e => {
            netBalances[e.paid_by] += Number(e.amount);
            e.expense_participants.forEach((p: any) => {
                netBalances[p.user_id] -= Number(p.amount);
            });
        });

        // 2. Process Settlements
        settledRes.data?.forEach(s => {
            netBalances[s.from_user_id] -= Number(s.amount);
            netBalances[s.to_user_id] += Number(s.amount);
        });

        // 3. Simplified view for the UI
        const simplified = simplifyDebts(netBalances);

        // 4. Return formatted response
        const formattedMembers = members.map((m: any) => ({
            id: m.user_id,
            name: m.users?.name,
            balance: Number(netBalances[m.user_id].toFixed(2))
        }));

        res.json({
            members: formattedMembers,
            simplifiedReports: simplified
        });
    } catch (err) {
        res.status(500).json({ error: 'Calculation failed' });
    }
});

// ──────────────────────────────────────────────
// POST /hisaab/expense 
// ──────────────────────────────────────────────
router.post('/expense', async (req: AuthRequest, res) => {
    try {
        const { groupId, description, amount, participants } = req.body;
        const userId = req.userId!;

        const { data: expense, error: expErr } = await supabase
            .from('expenses')
            .insert({ group_id: groupId, description, amount, paid_by: userId })
            .select().single();

        if (expErr) throw expErr;

        const partToInsert = participants.map((p: any) => ({
            expense_id: expense.id,
            user_id: p.userId,
            amount: p.amount
        }));

        await supabase.from('expense_participants').insert(partToInsert);
        res.status(201).json({ message: 'Expense added' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record expense' });
    }
});

// ──────────────────────────────────────────────
// POST /hisaab/settle
// ──────────────────────────────────────────────
router.post('/settle', async (req: AuthRequest, res) => {
    try {
        const { groupId, toUserId, amount } = req.body;
        const userId = req.userId!;

        await supabase.from('settlements').insert({
            group_id: groupId,
            from_user_id: userId,
            to_user_id: toUserId,
            amount
        });

        res.status(201).json({ message: 'Settlement recorded' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to settle' });
    }
});

export default router;
