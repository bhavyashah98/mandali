import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Require authentication for all moderation routes
router.use(authMiddleware);

/**
 * POST /moderation/report
 * Report a memory/content
 */
router.post('/report', async (req: AuthRequest, res) => {
    try {
        const { contentId, groupId, reason, contentType = 'memory' } = req.body;
        const reporterId = req.userId;

        if (!contentId || !groupId) {
            return res.status(400).json({ error: 'Content ID and Group ID are required' });
        }

        // 1. Log the report
        const { error: reportError } = await supabase
            .from('reports')
            .upsert({
                reporter_id: reporterId,
                content_id: contentId,
                group_id: groupId,
                content_type: contentType,
                reason: reason || 'Unspecified',
                created_at: new Date()
            }, { onConflict: 'reporter_id,content_id' });

        if (reportError) throw reportError;

        // 2. Check threshold logic
        // Get total group members
        const { count: totalMembers } = await supabase
            .from('group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', groupId);

        // Get unique reporters for this content
        const { count: reportCount } = await supabase
            .from('reports')
            .select('*', { count: 'exact', head: true })
            .eq('content_id', contentId);

        const threshold = (totalMembers || 1) * 0.5; // 50% threshold

        if ((reportCount || 0) >= threshold) {
            // Flag content as hidden
            await supabase
                .from('memories')
                .update({ is_hidden: true })
                .eq('id', contentId);
            
            console.log(`[Moderation] Content ${contentId} hidden due to high report count (${reportCount}/${totalMembers})`);
        }

        res.json({ success: true, message: 'Report submitted. Thank you for keeping Mandali safe.' });
    } catch (error: any) {
        console.error('[Moderation] Report error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /moderation/block
 * Block a user
 */
router.post('/block', async (req: AuthRequest, res) => {
    try {
        const { blockedId } = req.body;
        const blockerId = req.userId;

        if (!blockedId) {
            return res.status(400).json({ error: 'Blocked User ID is required' });
        }

        if (blockerId === blockedId) {
            return res.status(400).json({ error: 'You cannot block yourself' });
        }

        const { error } = await supabase
            .from('blocked_users')
            .upsert({
                blocker_id: blockerId,
                blocked_id: blockedId,
                created_at: new Date()
            }, { onConflict: 'blocker_id,blocked_id' });

        if (error) throw error;

        res.json({ success: true, message: 'User blocked. You will no longer see their content.' });
    } catch (error: any) {
        console.error('[Moderation] Block error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /moderation/blocked
 * Get list of blocked user IDs
 */
router.get('/blocked', async (req: AuthRequest, res) => {
    try {
        const blockerId = req.userId;

        const { data, error } = await supabase
            .from('blocked_users')
            .select('blocked_id')
            .eq('blocker_id', blockerId);

        if (error) throw error;

        res.json(data.map((b: any) => b.blocked_id));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
