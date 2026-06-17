import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { loadPlanAndAssertMember } from './planHelpers';
import { fetchBringItems, addBringItem, claimBringItem, unclaimBringItem, toggleUpvote, deleteBringItem, pinBringItem } from '../services/bringService';

const router = Router({ mergeParams: true });

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
        const io = req.app.get('io');
        const item = await addBringItem(req.params.id as string, plan.group_id, req.userId!, req.body.name, req.body.autoClaim);
        io?.to(`group_${plan.group_id}`).emit('bring_item_added', { planId: req.params.id, item });
        res.status(201).json({ item });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to add item' });
    }
});

router.post('/:itemId/claim', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        const io = req.app.get('io');
        const payload = await claimBringItem(req.params.id as string, req.params.itemId as string, req.userId!);
        io?.to(`group_${plan.group_id}`).emit('bring_item_claimed', payload);
        res.json(payload);
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to claim item' });
    }
});

router.delete('/:itemId/claim', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        const io = req.app.get('io');
        await unclaimBringItem(req.params.id as string, req.params.itemId as string, req.userId!);
        io?.to(`group_${plan.group_id}`).emit('bring_item_unclaimed', { planId: req.params.id, itemId: req.params.itemId });
        res.json({ success: true });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to unclaim item' });
    }
});

router.post('/:itemId/upvote', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        const io = req.app.get('io');
        const payload = await toggleUpvote(req.params.id as string, req.params.itemId as string, req.userId!);
        io?.to(`group_${plan.group_id}`).emit('bring_item_upvoted', payload);
        res.json(payload);
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to toggle upvote' });
    }
});

router.delete('/:itemId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        const io = req.app.get('io');
        await deleteBringItem(req.params.id as string, req.params.itemId as string);
        io?.to(`group_${plan.group_id}`).emit('bring_item_deleted', { planId: req.params.id, itemId: req.params.itemId });
        res.json({ success: true });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to delete item' });
    }
});

router.post('/:itemId/pin', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(req.params.id as string, req.userId!);
        const io = req.app.get('io');
        const isPinned = await pinBringItem(req.params.id as string, req.params.itemId as string, req.userId!, plan.created_by);
        io?.to(`group_${plan.group_id}`).emit('bring_item_pinned', { planId: req.params.id, itemId: req.params.itemId, isPinned });
        res.json({ success: true, isPinned });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to pin item' });
    }
});

export default router;
