import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /notifications?groupId=optional&page=0&limit=20
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
    const userId = req.userId;
    const groupId = req.query.groupId as string | undefined;
    const page = parseInt(req.query.page as string) || 0;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Get blocked users (two-way)
        const { data: blockedData } = await supabase
            .from('blocked_users')
            .select('blocked_id, blocker_id')
            .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
        const blockedUserIds = blockedData 
            ? Array.from(new Set(blockedData.flatMap(b => [b.blocked_id, b.blocker_id]))).filter(id => id !== userId) 
            : [];

        let query = supabase
            .from('notifications')
            .select('*, group:group_id(name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(page * limit, page * limit + limit - 1);

        if (groupId) {
            query = query.eq('group_id', groupId);
        }

        if (blockedUserIds.length > 0) {
            query = query.or(`actor_id.is.null,actor_id.not.in.(${blockedUserIds.join(',')})`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return res.status(200).json({ notifications: data || [] });
    } catch (error) {
        console.error('[Notifications] GET error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /notifications/read
router.post('/read', authMiddleware, async (req: AuthRequest, res) => {
    const userId = req.userId;
    const { notificationIds, groupId } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        let query = supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
            query = query.in('id', notificationIds);
        } else if (groupId) {
            query = query.eq('group_id', groupId);
        }

        const { error } = await query;

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('[Notifications] Read error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /notifications/unread-count
router.get('/unread-count', authMiddleware, async (req: AuthRequest, res) => {
    const userId = req.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) throw error;

        // Return as 'count' to match frontend expectation
        return res.status(200).json({ count: count || 0 });
    } catch (error) {
        console.error('[Notifications] Unread count error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
