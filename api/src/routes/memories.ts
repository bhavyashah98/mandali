import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendGroupPushNotification } from '../lib/push';

const router = Router();

/**
 * GET /memories/group/:groupId
 * Fetch all memories for a specific group, grouped by month
 */
router.get('/group/:groupId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;
        const page = parseInt(req.query.page as string) || 0;
        const limit = parseInt(req.query.limit as string) || 20;

        const from = page * limit;
        const to = from + limit - 1;

        // 1. Get blocked users
        const { data: blockedData } = await supabase
            .from('blocked_users')
            .select('blocked_id')
            .eq('blocker_id', userId);
        const blockedUserIds = blockedData?.map(b => b.blocked_id) || [];

        // 2. Get content reported by this user
        const { data: reportedData } = await supabase
            .from('reports')
            .select('content_id')
            .eq('reporter_id', userId);
        const reportedContentIds = reportedData?.map(r => r.content_id) || [];

        // 3. Fetch memories with filters and pagination
        let query = supabase
            .from('memories')
            .select(`
                *,
                user:user_id(name, avatar_url)
            `, { count: 'exact' })
            .eq('group_id', groupId)
            .eq('is_hidden', false) 
            .order('memory_date', { ascending: false })
            .range(from, to);

        if (blockedUserIds.length > 0) {
            query = query.not('user_id', 'in', `(${blockedUserIds.join(',')})`);
        }
        
        if (reportedContentIds.length > 0) {
            query = query.not('id', 'in', `(${reportedContentIds.join(',')})`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        res.json({
            memories: data,
            totalCount: count,
            page,
            hasMore: count ? (from + (data?.length || 0)) < count : false
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /memories
 * Create a new memory moment
 */
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { groupId, imageUrls, story, memoryDate } = req.body;
        const userId = req.userId;

        if (!groupId || !imageUrls || imageUrls.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log('[Memories] Creating memory for group:', groupId, 'by user:', userId);
        const { data, error } = await supabase
            .from('memories')
            .insert({
                group_id: groupId,
                user_id: userId,
                image_urls: imageUrls,
                story,
                memory_date: memoryDate || new Date(),
                created_at: new Date()
            })
            .select()
            .single();

        if (error) {
            console.error('[Memories] Supabase error:', error);
            throw error;
        }

        console.log('[Memories] Successfully stored memory:', data.id);

        // Notify other group members asynchronously without awaiting
        sendGroupPushNotification(
            groupId, 
            userId!, 
            '✨ New Memory Shared!', 
            'Someone just added a new memory to your group. Tap to view it!',
            { type: 'memory', groupId, url: `mandali://memories/${groupId}` }
        ).catch((err: any) => console.error('[Push Failed]:', err));

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /memories/:id
 * Delete a memory (only if owned by the user)
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const { error } = await supabase
            .from('memories')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
