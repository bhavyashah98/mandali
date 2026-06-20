import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { loadPlanAndAssertMember } from './planHelpers';
import { addShoutout, betCancel, fetchPlanHype, toggleReaction, upsertDressCode, upsertOutfit, votePrediction, voteShow } from '../services/planHypeService';
const router = Router({ mergeParams: true });

function emit(req: AuthRequest, groupId: string) {
    req.app.get('io')?.to(`group_${groupId}`).emit('plan_hype_updated', { planId: req.params.id });
    req.app.get('io')?.to(`group_${groupId}`).emit('plan_updated', { planId: req.params.id, action: 'hype' });
}
const planId = (req: AuthRequest) => req.params.id as string;

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(planId(req), req.userId!);
        res.json(await fetchPlanHype(planId(req), plan.group_id, req.userId!));
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to fetch hype' });
    }
});
router.put('/outfit', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(planId(req), req.userId!);
        const outfit = await upsertOutfit(planId(req), plan.group_id, req.userId!, req.body.text);
        emit(req, plan.group_id);
        res.json({ outfit });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to save outfit' });
    }
});
router.put('/dress-code', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(planId(req), req.userId!);
        const settings = await upsertDressCode(planId(req), plan.group_id, req.body.dressCode);
        emit(req, plan.group_id);
        res.json({ settings });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to save dress code' });
    }
});
router.post('/shoutouts', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(planId(req), req.userId!);
        const shoutout = await addShoutout(planId(req), plan.group_id, req.userId!, req.body.message);
        emit(req, plan.group_id);
        res.status(201).json({ shoutout });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to add shoutout' });
    }
});
router.post('/shoutouts/:shoutoutId/reactions', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(planId(req), req.userId!);
        await toggleReaction(planId(req), req.params.shoutoutId as string, req.userId!, req.body.emoji);
        emit(req, plan.group_id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to react' });
    }
});
router.post('/show-votes', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(planId(req), req.userId!);
        await voteShow(planId(req), plan.group_id, req.userId!, req.body.targetUserId, !!req.body.vote);
        emit(req, plan.group_id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to vote' });
    }
});
router.post('/cancel-bets', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(planId(req), req.userId!);
        await betCancel(planId(req), plan.group_id, req.userId!, req.body.targetUserId);
        emit(req, plan.group_id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to save bet' });
    }
});
router.post('/prediction-votes', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const plan = await loadPlanAndAssertMember(planId(req), req.userId!);
        await votePrediction(planId(req), plan.group_id, req.userId!, req.body.questionId, req.body.targetUserId);
        emit(req, plan.group_id);
        res.json({ success: true });
    } catch (err: any) {
        res.status(err.status || 500).json({ error: err.message || 'Failed to save vote' });
    }
});
export default router;
