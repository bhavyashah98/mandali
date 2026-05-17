import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { scheduleBlinkActivation, cancelBlinkActivation, preloadBlinkGame } from '../services/blinkEngine';
import { activeBlinkGames } from '../services/blinkMemory';

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
        const { groupId, title, maxPlayers, cardsPerPlayer, symbolsPerCard, theme } = req.body;
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
                symbols_per_card: symbolsPerCard || 6,
                theme: theme || 'default',
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 3. Automatically add host as participant
        const { error: hostJoinError } = await supabase.from('blink_players').upsert({
            game_id: game.id,
            user_id: userId,
        }, { onConflict: 'game_id,user_id' });

        if (hostJoinError) throw hostJoinError;

        // 4. Notify via socket to group
        const io = req.app.get('io');
        if (io) {
            io.to(`group_${groupId}`).emit('blink_game_created', { gameCode: game.game_code, groupId });
        }

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
        const { groupId, title, scheduledAt, maxPlayers, cardsPerPlayer, symbolsPerCard, theme } = req.body;
        const userId = req.userId!;
        const gameCode = generateGameCode();

        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'Only admins can schedule games.' });
        }

        // 2. Insert Game
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
                symbols_per_card: symbolsPerCard || 6,
                theme: theme || 'default',
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // 3. Automatically add host as participant
        const { error: hostJoinError } = await supabase.from('blink_players').upsert({
            game_id: game.id,
            user_id: userId,
        }, { onConflict: 'game_id,user_id' });

        if (hostJoinError) throw hostJoinError;

        // 4. Notify via socket to group
        const io = req.app.get('io');
        if (io) {
            io.to(`group_${groupId}`).emit('blink_game_scheduled', { gameCode: game.game_code, groupId });
        }

        res.status(201).json({ game, message: 'Game scheduled successfully' });
    } catch (error: any) {
        console.error('[Blink] Schedule Error:', error);
        res.status(500).json({ error: error.message || 'Failed to schedule Blink game' });
    }
});

/**
 * GET SPECIFIC PLAYER INFO (FOR THE AUTHENTICATED USER)
 * GET /blink/games/:gameCode/player
 */
router.get('/:gameCode/player', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const userId = req.userId!;

        const { data: game } = await supabase.from('blink_games').select('id').eq('game_code', gameCode).single();
        if (!game) return res.status(404).json({ error: 'Game not found' });

        const { data: player } = await supabase
            .from('blink_players')
            .select('user_id, current_card_id, cards_remaining')
            .eq('game_id', game.id)
            .eq('user_id', userId)
            .single();

        if (!player) return res.status(404).json({ error: 'Player not found in this game' });

        // Resolve symbols for the player's current card
        let currentCardSymbols: number[] = [];
        const { data: card } = await supabase
            .from('blink_cards')
            .select('symbols')
            .eq('id', player.current_card_id)
            .single();

        if (card) {
            currentCardSymbols = card.symbols;
        }

        res.json({
            player: {
                ...player,
                currentCardSymbols
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET GAME PLAYERS
 */
router.get('/:gameCode/players', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const { data: game } = await supabase.from('blink_games').select('id').eq('game_code', gameCode).single();
        if (!game) return res.status(404).json({ error: 'Game not found' });

        const { data: participants } = await supabase
            .from('blink_players')
            .select('user_id, hand, cards_left, users(name, avatar_url)')
            .eq('game_id', game.id);

        res.json({ participants });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET GAME DETAILS
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

        // Fetch participants
        const { data: participants } = await supabase
            .from('blink_players')
            .select('user_id, current_card_id, cards_remaining, users(name, avatar_url)')
            .eq('game_id', game.id);

        // Resolve symbols for the center card and each player's top card
        const cardIdsToResolve: number[] = [];

        if (game.current_center_card) {
            cardIdsToResolve.push(game.current_center_card);
        }

        (participants || []).forEach((p: any) => {
            if (p.current_card_id) {
                cardIdsToResolve.push(p.current_card_id);
            }
        });

        const { data: cardsData } = await supabase
            .from('blink_cards')
            .select('id, symbols')
            .in('id', cardIdsToResolve);

        const cardMap = new Map((cardsData || []).map(c => [c.id, c.symbols]));

        res.json({
            game: {
                ...game,
                centerCard: cardMap.get(game.current_center_card) || [],
                hostName: hostUser?.name || 'Host',
                hostAvatar: hostUser?.avatar_url,
                participants: (participants || []).map((p: any) => ({
                    id: p.user_id,
                    name: p.users?.name || 'Player',
                    avatar_url: p.users?.avatar_url,
                    currentCard: p.current_card_id ? cardMap.get(p.current_card_id) : [],
                    cardsLeft: p.cards_remaining
                }))
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
 * START GAME
 * POST /blink/games/:gameId/start
 */
router.post('/:gameId/start', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { gameId } = req.params;
        const userId = req.userId!;

        // 1. Fetch game settings
        const { data: game, error: gameError } = await supabase
            .from('blink_games')
            .select('*')
            .eq('id', gameId)
            .single();

        if (gameError || !game) return res.status(404).json({ error: 'Game not found' });
        if (game.status !== 'waiting' && game.status !== 'scheduled' && game.status !== 'starting') {
            return res.status(400).json({ error: 'Game cannot be started in current state.' });
        }

        // 2. Fetch participants
        const { data: participants } = await supabase
            .from('blink_players')
            .select('user_id, users(name, avatar_url)')
            .eq('game_id', game.id);

        if (!participants || participants.length < 1) {
            return res.status(400).json({ error: 'Need at least 1 player to start.' });
        }

        const now = new Date();
        const delaySeconds = game.status === 'scheduled' ? 60 : 15;
        const activationTime = new Date(now.getTime() + delaySeconds * 1000);

        const totalPlayers = participants.length;
        const totalPrizePool = totalPlayers * 100;
        let prizes: any[] = [];

        if (totalPlayers <= 2) {
            prizes = [{ id: '1st', name: '1st Place', description: 'Fastest matcher', percentage: 100, amount: totalPrizePool, icon: 'emoji-events' }];
        } else if (totalPlayers <= 5) {
            prizes = [
                { id: '1st', name: '1st Place', description: 'Fastest matcher', percentage: 70, amount: Math.floor(totalPrizePool * 0.70), icon: 'emoji-events' },
                { id: '2nd', name: '2nd Place', description: 'Runner up', percentage: 30, amount: Math.floor(totalPrizePool * 0.30), icon: 'military-tech' }
            ];
        } else {
            prizes = [
                { id: '1st', name: '1st Place', description: 'Fastest matcher', percentage: 50, amount: Math.floor(totalPrizePool * 0.50), icon: 'emoji-events' },
                { id: '2nd', name: '2nd Place', description: 'Runner up', percentage: 30, amount: Math.floor(totalPrizePool * 0.30), icon: 'military-tech' },
                { id: '3rd', name: '3rd Place', description: 'Second runner up', percentage: 20, amount: Math.floor(totalPrizePool * 0.20), icon: 'military-tech' }
            ];
        }

        const { error: updateError } = await supabase
            .from('blink_games')
            .update({
                status: 'starting',
                prizes: prizes,
                starting_at: now.toISOString(),
                activation_at: activationTime.toISOString()
            })
            .eq('id', gameId);

        if (updateError) throw updateError;

        // Schedule backend auto-activation after the countdown
        const io = req.app.get('io');
        scheduleBlinkActivation(io, gameId as string, delaySeconds * 1000);
        await preloadBlinkGame(gameId as string);

        if (io) {
            io.to(game.game_code.toUpperCase()).emit('blink_game_starting', { gameCode: game.game_code });
            io.to(`group_${game.group_id}`).emit('blink_game_starting', { gameCode: game.game_code, groupId: game.group_id });
        }

        res.json({ message: 'Game starting', gameCode: game.game_code });
    } catch (error: any) {
        console.error('[Blink] Start Route Error:', error);
        res.status(500).json({ error: error.message });
    }
});


/**
 * CANCEL GAME
 */
router.post('/:gameId/cancel', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { gameId } = req.params;
        const { reason } = req.body;
        const userId = req.userId!;

        const { data: game } = await supabase
            .from('blink_games')
            .select('host_id, status, group_id')
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

        cancelBlinkActivation(gameId as string);
        activeBlinkGames.delete(updated.game_code.toUpperCase());

        const io = req.app.get('io');
        if (io) {
            io.to(`group_${game.group_id}`).emit('blink_game_cancelled', { gameCode: updated.game_code, groupId: game.group_id });
            // Also emit to the game room itself
            io.to(updated.game_code.toUpperCase()).emit('blink_game_cancelled', { gameCode: updated.game_code });
        }

        res.json({ success: true, game: updated });
    } catch (error: any) {
        console.error('[Blink] Cancel Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * JOIN GAME
 * POST /blink/games/:gameCode/join
 */
router.post('/:gameCode/join', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const userId = req.userId!;

        const { data: game, error: gameError } = await supabase
            .from('blink_games')
            .select('id, status')
            .eq('game_code', gameCode)
            .single();

        if (gameError || !game) return res.status(404).json({ error: 'Game not found' });
        if (game.status !== 'waiting' && game.status !== 'scheduled') {
            return res.status(400).json({ error: 'Joining is closed for this game' });
        }

        // 2. Add to participants
        const { error: joinError } = await supabase
            .from('blink_players')
            .upsert({
                game_id: game.id,
                user_id: userId,
            }, { onConflict: 'game_id,user_id' });

        if (joinError) throw joinError;

        res.json({ success: true, message: 'Joined successfully' });
    } catch (error: any) {
        console.error('[Blink] Join Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// @route   POST /api/blink/:gameCode/end
// @desc    Manually end an active Blink game
// @access  Protected
router.post('/:gameCode/end', authMiddleware, async (req: any, res: any) => {
    const { gameCode } = req.params;
    const userId = req.userId;

    try {
        // 1. Verify game exists and user is host
        const { data: game, error: gameError } = await supabase
            .from('blink_games')
            .select('id, status, host_id, group_id')
            .eq('game_code', gameCode)
            .single();

        if (gameError || !game) return res.status(404).json({ error: 'Game not found' });

        if (game.host_id !== userId) {
            return res.status(403).json({ error: 'Only the host can end the game' });
        }

        if (game.status === 'ended') {
            return res.json({ success: true, message: 'Game already ended' });
        }

        // 2. Update status to ended
        const { error: updateError } = await supabase
            .from('blink_games')
            .update({ status: 'ended', ended_at: new Date().toISOString() })
            .eq('id', game.id);

        if (updateError) throw updateError;

        activeBlinkGames.delete(gameCode.toUpperCase());

        // 3. Broadcast end event
        const io = req.app.get('io');
        if (io) {
            io.to(gameCode.toUpperCase()).emit('blink_game_ended', { winner: null });
            io.to(`group_${game.group_id}`).emit('blink_game_ended', { gameCode, groupId: game.group_id });
        }

        res.json({ success: true, message: 'Game ended successfully' });
    } catch (error: any) {
        console.error('[Blink] End Game Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET GAME RESULTS
 * GET /blink/games/:gameCode/results
 */
router.get('/:gameCode/results', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();

        // 1. Resolve game
        const { data: game, error: gameError } = await supabase
            .from('blink_games')
            .select('id, group_id')
            .eq('game_code', gameCode)
            .single();

        if (gameError || !game) return res.status(404).json({ error: 'Game not found' });

        // 2. Fetch results for this game
        const { data: results, error: resultsError } = await supabase
            .from('game_results')
            .select('user_id, prize_name, prize_amount, users(name, avatar_url)')
            .eq('game_id', game.id)
            .order('won_at', { ascending: true }); // Winners arrive in rank order

        if (resultsError) throw resultsError;

        // 3. Transform to grouped results (per player) if needed, 
        // but for Blink each player usually wins once (1st, 2nd, or 3rd)
        const transformed = (results || []).map(r => ({
            userId: r.user_id,
            name: (r.users as any)?.name || 'Player',
            avatarUrl: (r.users as any)?.avatar_url,
            prizes: [{ name: r.prize_name, amount: r.prize_amount }],
            totalWon: r.prize_amount
        }));

        res.json({ results: transformed });
    } catch (error: any) {
        console.error('[Blink] Results Fetch Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET ALL-TIME GROUP LEADERBOARD FOR BLINK
 * Aggregates all game_results for a group across all Blink games
 * Query param: ?period=all_time|this_month|this_year
 */
router.get('/group/:groupId/leaderboard', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { groupId } = req.params;
        const period = (req.query.period as string) || 'all_time';


        // 1. Fetch all blink games for this group
        const { data: games, error: gamesError } = await supabase
            .from('blink_games')
            .select('id')
            .eq('group_id', groupId);

        if (gamesError) throw gamesError;
        if (!games || games.length === 0) return res.json({ leaderboard: [] });

        const gameIds = games.map(g => g.id);

        // 2. Fetch game results for these games
        let query = supabase
            .from('game_results')
            .select(`
                user_id,
                prize_name,
                prize_amount,
                game_id,
                won_at,
                users(name, avatar_url)
            `)
            .in('game_id', gameIds);

        // Apply date filter
        const now = new Date();
        if (period === 'this_month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            query = query.gte('won_at', start);
        } else if (period === 'this_year') {
            const start = new Date(now.getFullYear(), 0, 1).toISOString();
            query = query.gte('won_at', start);
        }

        const { data: results, error: resultsError } = await query;
        if (resultsError) throw resultsError;

        // 3. Count matches played per user in these games
        const { data: players, error: playersError } = await supabase
            .from('blink_players')
            .select('user_id, game_id')
            .in('game_id', gameIds);

        if (playersError) throw playersError;

        const matchesPlayedCount: Record<string, Set<string>> = {};
        (players || []).forEach(p => {
            if (!matchesPlayedCount[p.user_id]) {
                matchesPlayedCount[p.user_id] = new Set();
            }
            matchesPlayedCount[p.user_id].add(p.game_id);
        });

        // 4. Aggregate results
        const summary: Record<string, any> = {};
        (results || []).forEach(row => {
            const userData = Array.isArray(row.users) ? row.users[0] : row.users;

            if (!summary[row.user_id]) {
                summary[row.user_id] = {
                    userId: row.user_id,
                    name: userData?.name || 'Player',
                    avatarUrl: userData?.avatar_url,
                    totalWon: 0,
                    winCount: 0,
                    totalMatches: matchesPlayedCount[row.user_id]?.size || 0,
                    prizes: [],
                };
            }
            summary[row.user_id].totalWon += row.prize_amount;
            summary[row.user_id].winCount += 1;
            summary[row.user_id].prizes.push({
                name: row.prize_name,
                amount: row.prize_amount,
                wonAt: row.won_at
            });
        });

        const leaderboard = Object.values(summary)
            .map((p: any) => ({
                ...p,
                totalMatches: matchesPlayedCount[p.userId]?.size || p.totalMatches,
                prizes: p.prizes.sort((a: any, b: any) => new Date(b.wonAt).getTime() - new Date(a.wonAt).getTime())
            }))
            .sort((a, b) => b.winCount - a.winCount || b.totalWon - a.totalWon); // sort by win count, then total won

        res.json({ leaderboard });
    } catch (error: any) {
        console.error('[Blink Leaderboard] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
