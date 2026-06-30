import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { createNotification } from '../services/notificationService';
import { sendUserPushNotification } from '../lib/push';
import { NOTIFICATION_TYPES } from '../types/notifications';
import axios from 'axios';

const router = Router();

// Helper to notify developer instantly of abuse reports/blocks
const notifyDeveloper = async (action: string, data: any) => {
    try {
        console.warn(`[DEVELOPER_ALERT] Action: ${action} | Data:`, data);
        
        // If an admin webhook is configured (e.g. Slack/Discord), send it instantly
        if (process.env.ADMIN_WEBHOOK_URL) {
            await axios.post(process.env.ADMIN_WEBHOOK_URL, {
                content: `🚨 **Moderation Alert**: ${action}\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
            }).catch(() => {});
        }
    } catch (err) {
        console.error('Failed to notify developer:', err);
    }
};

// Require authentication for all moderation routes
router.use(authMiddleware);

/**
 * POST /moderation/report
 * Report a memory/content
 */
router.post('/report', async (req: AuthRequest, res) => {
    try {
        const { contentId, groupId, reason, contentType = 'memory', contentOwnerId, additionalNotes } = req.body;
        const reporterId = req.userId;

        if (!contentId || !groupId) {
            return res.status(400).json({ error: 'Content ID and Group ID are required' });
        }

        if (reporterId === contentOwnerId) {
            return res.status(400).json({ error: 'You cannot report your own content' });
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
                content_owner_id: contentOwnerId || null,
                additional_notes: additionalNotes || null,
                status: 'pending',
                created_at: new Date()
            }, { onConflict: 'reporter_id,content_id' });

        if (reportError) throw reportError;

        // Instantly notify developer of the report
        notifyDeveloper('NEW_REPORT', { reporterId, contentId, groupId, contentType, reason });

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
            if (contentType === 'comment') {
                await supabase
                    .from('memory_comments')
                    .update({ is_hidden: true })
                    .eq('id', contentId);
            } else {
                await supabase
                    .from('memories')
                    .update({ is_hidden: true })
                    .eq('id', contentId);
            }
            
            console.log(`[Moderation] Content ${contentId} (${contentType}) hidden due to high report count (${reportCount}/${totalMembers})`);
            
            // Notify the content owner
            if (contentOwnerId) {
                const title = 'Content Removed';
                const body = 'Your recent post has been removed as it was flagged by multiple members of your group for violating community guidelines.';
                
                await createNotification(
                    contentOwnerId,
                    NOTIFICATION_TYPES.CONTENT_REMOVED,
                    title,
                    body,
                    groupId,
                    reporterId,
                    contentId
                );

                sendUserPushNotification(
                    contentOwnerId,
                    {
                        title,
                        body,
                        data: { type: NOTIFICATION_TYPES.CONTENT_REMOVED, contentId, groupId }
                    }
                ).catch((err: any) => console.error('[Push Failed]:', err));
            }
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

        // Instantly notify developer of the block
        notifyDeveloper('USER_BLOCKED', { blockerId, blockedId });

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

/**
 * UNBLOCK A USER
 */
router.delete('/block/:blockedId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { blockedId } = req.params;
        const blockerId = req.userId!;

        const { error } = await supabase
            .from('blocked_users')
            .delete()
            .eq('blocker_id', blockerId)
            .eq('blocked_id', blockedId);

        if (error) throw error;

        res.json({ success: true, message: 'User unblocked' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * --- ADMIN MODERATION ENDPOINTS ---
 */

// Middleware to verify app-level admin access
const adminGuard = async (req: AuthRequest, res: any, next: any) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', req.userId)
            .single();

        if (error || !user || !user.is_admin) {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        next();
    } catch (err) {
        return res.status(500).json({ error: 'Failed to authenticate admin' });
    }
};

// GET /moderation/admin/reports - List all reports
router.get('/admin/reports', adminGuard, async (req: AuthRequest, res) => {
    try {
        const { status } = req.query;
        let query = supabase
            .from('reports')
            .select('*, reporter:reporter_id(name, phone), content_owner:content_owner_id(name, phone)')
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json({ reports: data || [] });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /moderation/admin/users/:id/status - Update user status & disconnect sockets
router.post('/admin/users/:id/status', adminGuard, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'active', 'suspended', 'banned'

        if (!['active', 'suspended', 'banned'].includes(status)) {
            return res.status(400).json({ error: 'Invalid user status' });
        }

        const { error } = await supabase
            .from('users')
            .update({ status })
            .eq('id', id);

        if (error) throw error;

        // Immediately disconnect user sockets if suspended/banned
        if (status === 'suspended' || status === 'banned') {
            const io = req.app.get('io');
            if (io) {
                console.log(`[Admin] Disconnecting active sockets for user ${id}`);
                io.to(`user_${id}`).disconnectSockets(true);
            }
        }

        res.json({ success: true, message: `User status successfully updated to ${status}` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /moderation/admin/memories/:id - Admin force remove post
router.delete('/admin/memories/:id', adminGuard, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('memories')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Memory successfully deleted by admin' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /moderation/admin/comments/:id - Admin force delete comment
router.delete('/admin/comments/:id', adminGuard, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('memory_comments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Comment successfully deleted by admin' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /moderation/admin/reports/:id/resolve - Resolve a report
router.post('/admin/reports/:id/resolve', adminGuard, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { resolution } = req.body; // 'dismissed', 'resolved'

        if (!['dismissed', 'resolved'].includes(resolution)) {
            return res.status(400).json({ error: 'Invalid resolution status' });
        }

        const { error } = await supabase
            .from('reports')
            .update({ 
                status: resolution,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: `Report successfully resolved as ${resolution}` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
