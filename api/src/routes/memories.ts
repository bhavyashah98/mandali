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

        const { data, error } = await supabase
            .from('memories')
            .select(`
                *,
                user:user_id(name, avatar_url)
            `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Grouping logic will be handled on the frontend for flexibility
        res.json(data);
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
        const { groupId, imageUrls, story } = req.body;
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
            { type: 'memory', groupId }
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
