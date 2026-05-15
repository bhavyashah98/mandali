import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * Generate a unique 6-character game code
 */
const generateGameCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

/**
 * CREATE GAME
 * POST /blink/games
 */
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { groupId, title, maxPlayers, cardsPerPlayer, difficultyLevel, theme } = req.body;
        const userId = req.userId!;
        const gameCode = generateGameCode();

        // 1. Verify user is admin of the group (or just member, depending on rules)
        // Similar to housie, let's enforce admin if group is admin-only, but let's assume admin check for now
        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of this group.' });
        }

        if (membership.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can host games.' });
        }

        // 2. Insert Game
        const { data: game, error: insertError } = await supabase
            .from('blink_games')
            .insert({
                game_code: gameCode,
                group_id: groupId,
                host_id: userId,
                status: 'waiting',
                title: title || 'Blink Game',
                max_players: maxPlayers || 30,
                cards_per_player: cardsPerPlayer || 12,
                difficulty_level: difficultyLevel || 6,
                theme: theme || 'default',
            })
            .select()
            .single();

        if (insertError) throw insertError;

        res.status(201).json({ game, message: 'Game created successfully' });
    } catch (error: any) {
        console.error('[Blink] Create Error:', error);
        res.status(500).json({ error: error.message || 'Failed to create Blink game' });
    }
});

/**
 * SCHEDULE GAME
 * POST /blink/games/schedule
 */
router.post('/schedule', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { groupId, title, scheduledAt, maxPlayers, cardsPerPlayer, difficultyLevel, theme } = req.body;
        const userId = req.userId!;
        const gameCode = generateGameCode();

        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (!membership || membership.role !== 'admin') {
            return res.status(403).json({ error: 'Only admins can schedule games.' });
        }

        const { data: game, error: insertError } = await supabase
            .from('blink_games')
            .insert({
                game_code: gameCode,
                group_id: groupId,
                host_id: userId,
                status: 'scheduled',
                title: title || 'Scheduled Blink Game',
                scheduled_at: scheduledAt,
                max_players: maxPlayers || 30,
                cards_per_player: cardsPerPlayer || 12,
                difficulty_level: difficultyLevel || 6,
                theme: theme || 'default',
            })
            .select()
            .single();

        if (insertError) throw insertError;

        res.status(201).json({ game, message: 'Game scheduled successfully' });
    } catch (error: any) {
        console.error('[Blink] Schedule Error:', error);
        res.status(500).json({ error: error.message || 'Failed to schedule Blink game' });
    }
});

/**
 * GET GAME DETAILS
 * GET /blink/games/:gameCode
 */
router.get('/:gameCode', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        
        const { data: game, error } = await supabase
            .from('blink_games')
            .select('*')
            .eq('game_code', gameCode)
            .single();

        if (error || !game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        // Fetch host info
        const { data: hostUser } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', game.host_id)
            .single();

        res.json({
            game: {
                ...game,
                hostName: hostUser?.name || 'Host',
                hostAvatar: hostUser?.avatar_url
            }
        });
    } catch (error: any) {
        console.error('[Blink] Get Game Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * LIST GROUP GAMES
 * GET /blink/games/group/:groupId
 */
router.get('/group/:groupId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId!;

        const { data: membership } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { data: games, error } = await supabase
            .from('blink_games')
            .select('*, host:users!host_id(name, avatar_url)')
            .eq('group_id', groupId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ games });
    } catch (error: any) {
        console.error('[Blink] List Games Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * CANCEL GAME
 * POST /blink/games/:gameId/cancel
 */
router.post('/:gameId/cancel', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { gameId } = req.params;
        const { reason } = req.body;
        const userId = req.userId!;

        const { data: game } = await supabase
            .from('blink_games')
            .select('host_id, status')
            .eq('id', gameId)
            .single();

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        if (game.host_id !== userId) {
            return res.status(403).json({ error: 'Only the host can cancel this game.' });
        }

        if (['ended', 'cancelled'].includes(game.status)) {
            return res.status(400).json({ error: `Game is already ${game.status}` });
        }

        const { data: updated, error } = await supabase
            .from('blink_games')
            .update({
                status: 'cancelled',
                cancellation_reason: reason || 'Cancelled by host',
                cancelled_by: userId
            })
            .eq('id', gameId)
            .select()
            .single();

        if (error) throw error;

        res.json({ success: true, game: updated });
    } catch (error: any) {
        console.error('[Blink] Cancel Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
