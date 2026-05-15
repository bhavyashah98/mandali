import express from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { emitGroupEvent, GroupEventType } from '../sockets/groupEvents';

const router = express.Router();

// All group routes require authentication
router.use(authMiddleware);

// Helper to sanitize incoming image URLs (handles legacy client objects/strings)
const sanitizeImageUrl = (url: any) => {
    if (!url) return null;
    // If it's the full Cloudinary object { url, publicId }
    if (typeof url === 'object' && url.url) return url.url;
    // If it's a string (could be a plain URL or a stringified JSON)
    if (typeof url === 'string') {
        if (url === '[object Object]') return null;
        try {
            // Check if it's a stringified JSON object
            if (url.startsWith('{')) {
                const parsed = JSON.parse(url);
                if (parsed.url) return parsed.url;
            }
        } catch (e) {
            // Not JSON, treat as plain string
        }
        return url;
    }
    return null;
};

// ──────────────────────────────────────────────
// POST /groups — Create a new group
// ──────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res) => {
    try {
        const { name, description, coverPhotoUrl } = req.body;
        const userId = req.userId!;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Group name is required' });
        }

        const sanitizedUrl = sanitizeImageUrl(coverPhotoUrl);
        console.log(`[Groups] 🆕 Creating group "${name}". Original:`, coverPhotoUrl, 'Sanitized:', sanitizedUrl);

        // Generate a unique 8-char invite code
        const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

        // 1. Create the group
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .insert({
                name: name.trim(),
                description,
                cover_photo_url: sanitizedUrl,
                invite_code: inviteCode,
                admin_user_id: userId,
            })
            .select()
            .single();

        if (groupError) {
            console.error('[Groups] Create error:', groupError);
            return res.status(500).json({ error: 'Failed to create group' });
        }

        // 2. Add creator as admin member
        const { error: memberError } = await supabase
            .from('group_members')
            .insert({
                group_id: group.id,
                user_id: userId,
                role: 'admin',
            });

        if (memberError) {
            console.error('[Groups] Add admin member error:', memberError);
            await supabase.from('groups').delete().eq('id', group.id);
            return res.status(500).json({ error: 'Failed to add you as group admin' });
        }

        const io = req.app.get('io');
        emitGroupEvent(io, group.id, GroupEventType.GROUP_CREATED, group, [userId]);

        res.status(201).json({
            group,
            message: 'Group created successfully',
        });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// GET /groups — List all groups for current user
// ──────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res) => {
    try {
        const userId = req.userId!;

        const { data: memberships, error: memberError } = await supabase
            .from('group_members')
            .select('group_id, role')
            .eq('user_id', userId);

        if (memberError) {
            console.error('[Groups] List memberships error:', memberError);
            return res.status(500).json({ error: 'Failed to fetch groups' });
        }

        if (!memberships || memberships.length === 0) {
            return res.json({ groups: [] });
        }

        const groupIds = memberships.map((m: any) => m.group_id);

        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*')
            .in('id', groupIds)
            .order('created_at', { ascending: false });

        if (groupsError) {
            console.error('[Groups] List groups error:', groupsError);
            return res.status(500).json({ error: 'Failed to fetch groups' });
        }

        const groupsWithMeta = await Promise.all(
            groups.map(async (group: any) => {
                const [memberCountRes, winningsRes] = await Promise.all([
                    supabase
                        .from('group_members')
                        .select('*', { count: 'exact', head: true })
                        .eq('group_id', group.id),
                    supabase
                        .from('game_results')
                        .select('prize_amount')
                        .eq('group_id', group.id)
                        .eq('user_id', userId)
                ]);

                const totalWinnings = (winningsRes.data || []).reduce((acc: number, curr: any) => acc + (curr.prize_amount || 0), 0);
                const membership = memberships.find((m: any) => m.group_id === group.id);

                return {
                    ...group,
                    memberCount: memberCountRes.count || 0,
                    myRole: membership?.role || 'member',
                    totalWinnings,
                };
            })
        );

        res.json({ groups: groupsWithMeta });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// GET /groups/:id — Get single group with members
// ──────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .eq('id', id)
            .single();

        if (groupError || !group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const { data: members } = await supabase
            .from('group_members')
            .select('id, role, joined_at, user_id, users(id, name, phone, avatar_url)')
            .eq('group_id', id)
            .order('joined_at', { ascending: true });

        res.json({
            group,
            members: members || [],
            myRole: membership.role,
        });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// GET /groups/:id/blink-games — List Blink games for group
// ──────────────────────────────────────────────
router.get('/:id/blink-games', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        const { data: membership } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { data: games, error } = await supabase
            .from('blink_games')
            .select('*, host:users!host_id(name, avatar_url)')
            .eq('group_id', id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ games });
    } catch (error: any) {
        console.error('[Groups] List Blink Games Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ──────────────────────────────────────────────
// POST /groups/join — Join a group via invite code
// ──────────────────────────────────────────────
router.post('/join', async (req: AuthRequest, res) => {
    try {
        const { inviteCode } = req.body;
        const userId = req.userId!;

        if (!inviteCode || !inviteCode.trim()) {
            return res.status(400).json({ error: 'Invite code is required' });
        }

        const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .eq('invite_code', inviteCode.trim().toUpperCase())
            .single();

        if (groupError || !group) {
            return res.status(404).json({ error: 'Invalid invite code. No group found.' });
        }

        const { data: existing } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', group.id)
            .eq('user_id', userId)
            .single();

        if (existing) {
            return res.status(409).json({ error: 'You are already a member of this group', group });
        }

        const { error: joinError } = await supabase
            .from('group_members')
            .insert({
                group_id: group.id,
                user_id: userId,
                role: 'member',
            });

        if (joinError) {
            console.error('[Groups] Join error:', joinError);
            return res.status(500).json({ error: 'Failed to join group' });
        }

        const io = req.app.get('io');
        emitGroupEvent(io, group.id, GroupEventType.MEMBER_JOINED, { userId }, [userId]);

        res.json({ group, message: 'Joined group successfully' });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// PATCH /groups/:id — Update group (Admin Only)
// ──────────────────────────────────────────────
router.patch('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { name, description, coverPhotoUrl } = req.body;
        const userId = req.userId!;

        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can update group settings' });
        }

        const updates: any = {};
        if (name) updates.name = name.trim();
        if (description !== undefined) updates.description = description;
        if (coverPhotoUrl !== undefined) {
            const sanitizedUrl = sanitizeImageUrl(coverPhotoUrl);
            console.log(`[Groups] 🔄 Updating group ${id}. Original:`, coverPhotoUrl, 'Sanitized:', sanitizedUrl);
            updates.cover_photo_url = sanitizedUrl;
        }

        const { data: group, error: updateError } = await supabase
            .from('groups')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            console.error('[Groups] Update error:', updateError);
            return res.status(500).json({ error: 'Failed to update group' });
        }

        const io = req.app.get('io');
        emitGroupEvent(io, id as string, GroupEventType.GROUP_UPDATED, group, [userId]);

        res.json({ group, message: 'Group updated successfully' });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// DELETE /groups/:id — Delete group (Admin Only)
// ──────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can delete groups' });
        }

        const { error: deleteError } = await supabase
            .from('groups')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('[Groups] Delete error:', deleteError);
            return res.status(500).json({ error: 'Failed to delete group' });
        }

        res.json({ message: 'Group permanently deleted' });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// POST /groups/:id/leave — Leave a group
// ──────────────────────────────────────────────
router.post('/:id/leave', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId!;

        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(404).json({ error: 'Membership not found' });
        }

        if (membership.role === 'admin') {
            const { count } = await supabase
                .from('group_members')
                .select('*', { count: 'exact', head: true })
                .eq('group_id', id);

            if (count && count > 1) {
                return res.status(400).json({
                    error: 'Please transfer ownership to another member before leaving the group.'
                });
            }
        }

        const { error: leaveError } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', id)
            .eq('user_id', userId);

        if (leaveError) {
            console.error('[Groups] Leave error:', leaveError);
            return res.status(500).json({ error: 'Failed to leave group' });
        }

        const io = req.app.get('io');
        emitGroupEvent(io, id as string, GroupEventType.MEMBER_LEFT, { userId }, [userId]);

        res.json({ message: 'Successfully left the group' });
    } catch (err) {
        console.error('[Groups] Unexpected error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ──────────────────────────────────────────────
// POST /groups/:id/transfer-ownership — Transfer Admin Role
// ──────────────────────────────────────────────
router.post('/:id/transfer-ownership', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { newAdminUserId } = req.body;
        const userId = req.userId!;

        if (!newAdminUserId) {
            return res.status(400).json({ error: 'Target member ID is required for transfer' });
        }

        const { data: myMembership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', id)
            .eq('user_id', userId)
            .single();

        if (!myMembership || myMembership.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can transfer ownership' });
        }

        const { data: targetMembership } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', id)
            .eq('user_id', newAdminUserId)
            .single();

        if (!targetMembership) {
            return res.status(400).json({ error: 'Target user is not a member of this group' });
        }

        await Promise.all([
            supabase.from('group_members').update({ role: 'admin' }).eq('group_id', id).eq('user_id', newAdminUserId),
            supabase.from('group_members').update({ role: 'member' }).eq('group_id', id).eq('user_id', userId),
            supabase.from('groups').update({ admin_user_id: newAdminUserId }).eq('id', id)
        ]);

        const io = req.app.get('io');
        emitGroupEvent(io, id as string, GroupEventType.MEMBERSHIP_CHANGED, { newAdminUserId }, [userId, newAdminUserId]);

        res.json({ message: 'Ownership transferred successfully' });
    } catch (err) {
        console.error('[Groups] Transfer error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
