import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendGroupPushNotification, sendUserPushNotification } from '../lib/push';

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

        let enrichedMemories = [];
        if (data && data.length > 0) {
            const memoryIds = data.map((m: any) => m.id);

            // Fetch comments by memory_id to count them
            const { data: commentsData } = await supabase
                .from('memory_comments')
                .select('memory_id')
                .in('memory_id', memoryIds);

            const commentCounts = (commentsData || []).reduce((acc: any, curr: any) => {
                acc[curr.memory_id] = (acc[curr.memory_id] || 0) + 1;
                return acc;
            }, {});

            // Fetch reactions by memory_id to aggregate
            const { data: reactionsData } = await supabase
                .from('memory_reactions')
                .select('memory_id, reaction, user_id')
                .in('memory_id', memoryIds);

            const reactionsSummary = (reactionsData || []).reduce((acc: any, curr: any) => {
                if (!acc[curr.memory_id]) acc[curr.memory_id] = { summary: {}, userReaction: null };
                const memorySummary = acc[curr.memory_id];
                
                memorySummary.summary[curr.reaction] = (memorySummary.summary[curr.reaction] || 0) + 1;
                if (curr.user_id === userId) {
                    memorySummary.userReaction = curr.reaction;
                }
                
                return acc;
            }, {});

            enrichedMemories = data.map((m: any) => ({
                ...m,
                commentCount: commentCounts[m.id] || 0,
                reactionsSummary: reactionsSummary[m.id]?.summary || {},
                userReaction: reactionsSummary[m.id]?.userReaction || null
            }));
        }

        res.json({
            memories: enrichedMemories,
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

        // Final check for image limit before creating memory
        const { data: existingMemories } = await supabase
            .from('memories')
            .select('image_urls')
            .eq('user_id', userId);

        let currentTotal = 0;
        existingMemories?.forEach(m => {
            if (Array.isArray(m.image_urls)) currentTotal += m.image_urls.length;
        });

        if (currentTotal + imageUrls.length > 200) {
            return res.status(403).json({ 
                error: `Upload limit reached. You have ${currentTotal} images and this would exceed the 200 image limit. Please delete some memories.` 
            });
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
            { type: 'memory', groupId, url: `mandali://memories/${groupId}/${data.id}` }
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

/**
 * GET /memories/:id/comments
 * Fetch comments for a specific memory
 */
router.get('/:id/comments', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('memory_comments')
            .select(`
                *,
                user:user_id(name, avatar_url)
            `)
            .eq('memory_id', id)
            .order('created_at', { ascending: true });

        if (error) throw error;
        res.json({ comments: data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /memories/:id/comments
 * Add a comment to a specific memory
 */
router.post('/:id/comments', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;
        const userId = req.userId;

        if (!comment || comment.trim() === '') {
            return res.status(400).json({ error: 'Comment content cannot be empty' });
        }

        const { data, error } = await supabase
            .from('memory_comments')
            .insert({
                memory_id: id,
                user_id: userId,
                comment: comment.trim()
            })
            .select(`
                *,
                user:user_id(name, avatar_url)
            `)
            .single();

        if (error) throw error;

        // Send notification to memory owner
        if (data) {
            const { data: memory } = await supabase
                .from('memories')
                .select('user_id, group_id')
                .eq('id', id)
                .single();

            if (memory && memory.user_id && memory.user_id !== userId) {
                const commenterName = data.user?.name || 'Someone';
                sendUserPushNotification(
                    memory.user_id,
                    '💬 New Comment',
                    `${commenterName} commented on your memory.`,
                    { type: 'memory_comment', memoryId: id, groupId: memory.group_id, url: `mandali://memories/${memory.group_id}/${id}` }
                ).catch(err => console.error('[Push Failed]:', err));
            }
        }

        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /memories/comments/:commentId
 * Delete a comment (only owner can delete)
 */
router.delete('/comments/:commentId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.userId;

        const { error } = await supabase
            .from('memory_comments')
            .delete()
            .eq('id', commentId)
            .eq('user_id', userId);

        if (error) throw error;
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /memories/:id/reactions
 * Fetch reactions count and user details
 */
router.get('/:id/reactions', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const { data, error } = await supabase
            .from('memory_reactions')
            .select(`
                *,
                user:user_id(name, avatar_url)
            `)
            .eq('memory_id', id);

        if (error) throw error;

        // Group and count reactions
        const summary: Record<string, number> = {};
        let userReaction: string | null = null;

        data?.forEach((row: any) => {
            summary[row.reaction] = (summary[row.reaction] || 0) + 1;
            if (row.user_id === userId) {
                userReaction = row.reaction;
            }
        });

        res.json({
            reactions: data || [],
            summary,
            userReaction
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /memories/:id/reactions
 * Toggle or update reaction on a memory
 */
router.post('/:id/reactions', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { reaction } = req.body;
        const userId = req.userId;

        if (!reaction || reaction.trim() === '') {
            return res.status(400).json({ error: 'Reaction cannot be empty' });
        }

        // Check if there is an existing reaction by this user on this memory
        const { data: existing, error: fetchError } = await supabase
            .from('memory_reactions')
            .select('*')
            .eq('memory_id', id)
            .eq('user_id', userId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
            if (existing.reaction === reaction) {
                // Same reaction: toggle off (delete)
                const { error: deleteError } = await supabase
                    .from('memory_reactions')
                    .delete()
                    .eq('id', existing.id);
                if (deleteError) throw deleteError;
                return res.json({ success: true, action: 'removed', reaction: null });
            } else {
                // Different reaction: update
                const { data: updated, error: updateError } = await supabase
                    .from('memory_reactions')
                    .update({ reaction })
                    .eq('id', existing.id)
                    .select()
                    .single();
                if (updateError) throw updateError;
                return res.json({ success: true, action: 'updated', reaction: updated.reaction });
            }
        } else {
            // No reaction: insert
            const { data: inserted, error: insertError } = await supabase
                .from('memory_reactions')
                .insert({
                    memory_id: id,
                    user_id: userId,
                    reaction
                })
                .select()
                .single();
            if (insertError) throw insertError;

            // Notify memory owner
            const { data: memory } = await supabase
                .from('memories')
                .select('user_id, group_id')
                .eq('id', id)
                .single();

            if (memory && memory.user_id && memory.user_id !== userId) {
                const { data: reactor } = await supabase
                    .from('users')
                    .select('name')
                    .eq('id', userId)
                    .single();

                const reactorName = reactor?.name || 'Someone';
                sendUserPushNotification(
                    memory.user_id,
                    '❤️ Photo Liked',
                    `${reactorName} liked your photo`,
                    { type: 'memory_reaction', memoryId: id, groupId: memory.group_id, url: `mandali://memories/${memory.group_id}/${id}` }
                ).catch(err => console.error('[Push Failed]:', err));
            }

            return res.json({ success: true, action: 'added', reaction: inserted.reaction });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
