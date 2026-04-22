import express from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// All chat routes require authentication
router.use(authMiddleware);

// ──────────────────────────────────────────────
// GET /chat/:groupId/messages — Paginated messages
// ──────────────────────────────────────────────
router.get('/:groupId/messages', async (req: AuthRequest, res) => {
    try {
        const { groupId } = req.params;
        const { cursor, limit = 20 } = req.query;
        const userId = req.userId!;

        // 1. Verify membership
        const { data: membership, error: memError } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (memError || !membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // 2. Build query
        let query = supabase
            .from('messages')
            .select(`
                *,
                sender:users(id, name, avatar_url),
                reactions:message_reactions(id, emoji, user_id, users(name)),
                reply_to:messages(id, content, sender:users(name))
            `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false })
            .limit(Number(limit));

        // Cursor-based pagination (using created_at)
        if (cursor) {
            query = query.lt('created_at', cursor as string);
        }

        const { data: messages, error } = await query;

        if (error) {
            console.error('[Chat] Fetch messages error:', error);
            return res.status(500).json({ error: 'Failed to fetch messages' });
        }

        res.json({ 
            messages: messages || [],
            nextCursor: messages && messages.length === Number(limit) ? messages[messages.length - 1].created_at : null
        });
    } catch (err) {
        console.error('[Chat] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// PATCH /chat/message/:id — Edit message
// ──────────────────────────────────────────────
router.patch('/message/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.userId!;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Content is required' });
        }

        // Verify ownership
        const { data: message, error: fetchError } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('id', id)
            .single();

        if (fetchError || !message) return res.status(404).json({ error: 'Message not found' });
        if (message.sender_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

        const { data: updated, error: updateError } = await supabase
            .from('messages')
            .update({ content: content.trim() })
            .eq('id', id)
            .select()
            .single();

        if (updateError) throw updateError;

        res.json({ message: updated });
    } catch (err) {
        res.status(500).json({ error: 'Failed to edit message' });
    }
});

// ──────────────────────────────────────────────
// DELETE /chat/message/:id — Soft delete
// ──────────────────────────────────────────────
router.delete('/message/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        // Verify ownership or group admin status
        const { data: message, error: fetchError } = await supabase
            .from('messages')
            .select('sender_id, group_id')
            .eq('id', id)
            .single();

        if (fetchError || !message) return res.status(404).json({ error: 'Message not found' });

        const { data: adminCheck } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', message.group_id)
            .eq('user_id', userId)
            .single();

        if (message.sender_id !== userId && adminCheck?.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { error: deleteError } = await supabase
            .from('messages')
            .update({ is_deleted: true, content: null, media_url: null })
            .eq('id', id);

        if (deleteError) throw deleteError;

        res.json({ success: true, message: 'Message deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// ──────────────────────────────────────────────
// GET /chat/:groupId/members — Members + Status
// ──────────────────────────────────────────────
router.get('/:groupId/members', async (req: AuthRequest, res) => {
    try {
        const { groupId } = req.params;

        const { data: members, error } = await supabase
            .from('group_members')
            .select(`
                role,
                users (
                    id,
                    name,
                    avatar_url,
                    online_status,
                    last_seen
                )
            `)
            .eq('group_id', groupId);

        if (error) throw error;

        res.json({ members: members || [] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

export default router;
