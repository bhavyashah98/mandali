import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { loadPlanAndAssertMember } from './planHelpers';
import { fetchBringItems, addBringItem, claimBringItem, unclaimBringItem, toggleUpvote, deleteBringItem, pinBringItem } from '../services/bringService';

const router = Router({ mergeParams: true });

function emitBringChange(req: AuthRequest, groupId: string, event: string, payload: any) {
    const io = req.app.get('io');
    io?.to(`group_${groupId}`).emit(event, payload);
    io?.to(`group_${groupId}`).emit('plan_hype_updated', { planId: payload.planId });
    io?.to(`group_${groupId}`).emit('plan_updated', { planId: payload.planId, action: event });
}

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        const items = await fetchBringItems(req.params.id as string, req.userId!);
        res.json({ items });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to fetch items' });
    }
});

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        const item = await addBringItem(req.params.id as string, plan.group_id, req.userId!, req.body.name, req.body.autoClaim);
        emitBringChange(req, plan.group_id, 'bring_item_added', { planId: req.params.id, item });
        res.status(201).json({ item });
    } catch (err: any) {
        console.error('[Bring Items] Failed to add item:', err);
        res.status(err.status || 500).json({ error: err.message || 'Failed to add item' });
    }
});

router.post('/:itemId/claim', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        const payload = await claimBringItem(req.params.id as string, req.params.itemId as string, req.userId!);
        emitBringChange(req, plan.group_id, 'bring_item_claimed', payload);
        res.json(payload);
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to claim item' });
    }
});

router.delete('/:itemId/claim', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        await unclaimBringItem(req.params.id as string, req.params.itemId as string, req.userId!);
        emitBringChange(req, plan.group_id, 'bring_item_unclaimed', { planId: req.params.id, itemId: req.params.itemId });
        res.json({ success: true });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to unclaim item' });
    }
});

router.post('/:itemId/upvote', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        const payload = await toggleUpvote(req.params.id as string, req.params.itemId as string, req.userId!);
        emitBringChange(req, plan.group_id, 'bring_item_upvoted', payload);
        res.json(payload);
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to toggle upvote' });
    }
});

router.delete('/:itemId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        await deleteBringItem(req.params.id as string, req.params.itemId as string);
        emitBringChange(req, plan.group_id, 'bring_item_deleted', { planId: req.params.id, itemId: req.params.itemId });
        res.json({ success: true });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to delete item' });
    }
});

router.post('/:itemId/pin', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        const isPinned = await pinBringItem(req.params.id as string, req.params.itemId as string, req.userId!, plan.created_by);
        emitBringChange(req, plan.group_id, 'bring_item_pinned', { planId: req.params.id, itemId: req.params.itemId, isPinned });
        res.json({ success: true, isPinned });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to pin item' });
    }
});

export default router;
