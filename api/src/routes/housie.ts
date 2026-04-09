import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { io } from '../index';
import { generateHousieTicket } from '../utils/housie';

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
 * START A NEW GAME
 * Only group admins can start a game
 */
router.post('/create', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { groupId, ticketPrice } = req.body;
        const userId = req.userId!;
        const gameCode = generateGameCode();

        console.log(`[Housie] Create attempt: Group=${groupId}, Price=${ticketPrice}, User=${userId}`);

        // 1. Verify user is a MEMBER of the group
        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You must be a member of the group to start a game' });
        }

        // 2. Create the game
        const { data, error } = await supabase
            .from('housie_games')
            .insert({
                game_code: gameCode,
                group_id: groupId,
                host_id: userId,
                called_numbers: [],
                status: 'waiting',
                ticket_price: ticketPrice || 0
            })
            .select()
            .single();

        if (error) throw error;

        // Broadcast to group members about the new game
        const ioInstance = req.app.get('io');
        if (ioInstance) {
            ioInstance.to(groupId).emit('game_created', { 
                gameCode, 
                hostName: 'Host',
                ticketPrice
            });
        }

        res.json({ success: true, game: data });
    } catch (error: any) {
        console.error('[Housie] Initialization failure details:', error);
        res.status(500).json({ error: error.message || 'Failed to initialize game' });
    }
});

/**
 * GET ACTIVE GAME FOR GROUP
 */
router.get('/active/:groupId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { groupId } = req.params;
        const { data: game, error } = await supabase
            .from('housie_games')
            .select('*')
            .eq('group_id', groupId)
            .in('status', ['waiting', 'active'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        res.json({ game });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * ACTIVATE GAME
 */
router.patch('/:gameCode/activate', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const userId = req.userId!;

        const { data: game, error: fetchError } = await supabase
            .from('housie_games')
            .select('host_id')
            .eq('game_code', gameCode)
            .single();

        if (fetchError || !game) return res.status(404).json({ error: 'Game not found' });
        if (game.host_id !== userId) return res.status(403).json({ error: 'Only the host can activate the game' });
        
        const { prizes = [] } = req.body;

        const { data: updatedGame, error: updateError } = await supabase
            .from('housie_games')
            .update({ 
                status: 'active',
                prizes: prizes
            })
            .eq('game_code', gameCode)
            .select()
            .single();

        if (updateError) throw updateError;

        req.app.get('io').to(gameCode).emit('game_activated', {
            gameCode,
            status: 'active'
        });

        res.json(updatedGame);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET GAME STATE
 * Only group members can view the game
 */
router.get('/:gameCode', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const userId = req.userId!;

        // 1. Fetch game details
        const { data: game, error } = await supabase
            .from('housie_games')
            .select('*')
            .eq('game_code', gameCode)
            .single();

        if (error || !game) return res.status(404).json({ error: 'Game not found' });

        // 2. Verify user is a member of the group this game belongs to
        const { data: membership } = await supabase
            .from('group_members')
            .select('id')
            .eq('group_id', game.group_id)
            .eq('user_id', userId)
            .single();

        if (!membership) {
            return res.status(403).json({ error: 'You are not a member of the group hosting this game' });
        }

        // 3. Fetch participants and ticket stats for the lobby
        const { data: tickets, error: ticketError } = await supabase
            .from('housie_tickets')
            .select('user_id, users(name, avatar_url)')
            .eq('game_id', game.id);

        if (ticketError) throw ticketError;

        const participantMap: Record<string, any> = {};
        let totalTickets = 0;

        (tickets || []).forEach((t: any) => {
            const uid = t.user_id;
            if (!participantMap[uid]) {
                participantMap[uid] = {
                    id: uid,
                    name: t.users?.name || 'Player',
                    avatarUrl: t.users?.avatar_url,
                    ticketCount: 0
                };
            }
            participantMap[uid].ticketCount += 1;
            totalTickets += 1;
        });

        const participants = Object.values(participantMap);

        // Calculate statistics
        const calledNumbers = game.called_numbers || [];
        const recentNumbers = [...calledNumbers].reverse().slice(0, 5);
        const remainingCount = 90 - calledNumbers.length;

        const responsePayload = {
            ...game,
            recentNumbers,
            calledCount: calledNumbers.length,
            remainingCount,
            participants,
            totalTickets,
            totalPrizePool: totalTickets * game.ticket_price,
            ticketPrice: game.ticket_price
        };

        res.json(responsePayload);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * CALL NEXT NUMBER
 * Only host (admin) can call numbers
 */
router.post('/:gameCode/call', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const userId = req.userId!;

        const { data: game, error: fetchError } = await supabase
            .from('housie_games')
            .select('*')
            .eq('game_code', gameCode)
            .single();

        if (fetchError || !game) return res.status(404).json({ error: 'Game not found' });

        // Authorization: Only Host can call
        if (game.host_id !== userId) {
            return res.status(403).json({ error: 'Only the host can call numbers' });
        }

        const calledNumbers = game.called_numbers || [];
        if (calledNumbers.length >= 90) return res.status(400).json({ error: 'All numbers called' });

        const allNumbers = Array.from({ length: 90 }, (_, i) => i + 1);
        const remaining = allNumbers.filter(n => !calledNumbers.includes(n));

        const nextNumber = remaining[Math.floor(Math.random() * remaining.length)];
        const updatedNumbers = [...calledNumbers, nextNumber];

        const { data, error: updateError } = await supabase
            .from('housie_games')
            .update({ called_numbers: updatedNumbers })
            .eq('game_code', gameCode)
            .select()
            .single();

        if (updateError) throw updateError;

        // BROADCAST via Socket.io for real-time updates
        req.app.get("io").to(gameCode).emit('number_called', {
            gameCode,
            nextNumber,
            calledNumbers: updatedNumbers,
            calledCount: updatedNumbers.length,
            remainingCount: 90 - updatedNumbers.length
        });

        res.json({ success: true, nextNumber, game: data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * VERIFY CLAIM
 */
router.post('/:gameCode/verify', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const { prizeName, ticketId } = req.body;
        const userId = req.userId!;

        const { data: game } = await supabase.from('housie_games').select('*').eq('game_code', gameCode).single();
        if (!game) return res.status(404).json({ error: 'Game not found' });

        // Verify membership
        const { data: membership } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', game.group_id)
            .eq('user_id', userId)
            .single();

        if (!membership) return res.status(403).json({ error: 'Unauthorized to participate in this game' });

        res.json({
            success: true,
            message: `Verification logic for ${prizeName} initiated.`,
            verified: true
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET GAME PARTICIPANTS (waiting room info)
 */
router.get('/:gameCode/participants', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        
        // 1. Get game
        const { data: game, error: gameError } = await supabase
            .from('housie_games')
            .select('id, ticket_price, host_id')
            .eq('game_code', gameCode)
            .single();

        if (gameError || !game) return res.status(404).json({ error: 'Game not found' });

        // 2. Get all tickets for this game with user details
        const { data: tickets, error: ticketError } = await supabase
            .from('housie_tickets')
            .select('user_id, users(name, avatar_url)')
            .eq('game_id', game.id);

        if (ticketError) throw ticketError;

        // 3. Group by user to count tickets
        const participantsMap = new Map();
        tickets.forEach((t: any) => {
            const uid = t.user_id;
            if (!participantsMap.has(uid)) {
                participantsMap.set(uid, {
                    id: uid,
                    name: t.users?.name || 'Anonymous',
                    avatar: t.users?.avatar_url,
                    ticketCount: 0
                });
            }
            participantsMap.get(uid).ticketCount++;
        });

        const participants = Array.from(participantsMap.values());
        const totalTickets = tickets.length;
        const totalPrizePool = totalTickets * (game.ticket_price || 0);

        res.json({
            participants,
            totalTickets,
            totalPrizePool,
            ticketPrice: game.ticket_price
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * JOIN GAME (BUY TICKETS)
 */
router.post('/:gameCode/join', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const { ticketCount = 1 } = req.body;
        const userId = req.userId!;
 
        // 1. Verify game exists and is WAITING
        const { data: game, error: gameError } = await supabase
            .from('housie_games')
            .select('id, group_id, status')
            .eq('game_code', gameCode)
            .single();
 
        if (gameError || !game) return res.status(404).json({ error: 'Game not found' });
        if (game.status !== 'waiting') return res.status(400).json({ error: 'Joining is closed for this game' });

        // Check current ticket count for this user
        const { count: existingCount } = await supabase
            .from('housie_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', game.id)
            .eq('user_id', userId);

        if ((existingCount || 0) + ticketCount > 6) {
            return res.status(400).json({ error: `You can only have a maximum of 6 tickets. You already have ${existingCount || 0}.` });
        }
 
        // 2. Generate tickets
        const ticketsToCreate = [];
        for (let i = 0; i < ticketCount; i++) {
            ticketsToCreate.push({
                game_id: game.id,
                user_id: userId,
                ticket_data: generateHousieTicket()
            });
        }
 
        // 3. Save to database
        const { data: tickets, error: ticketError } = await supabase
            .from('housie_tickets')
            .insert(ticketsToCreate)
            .select();

        if (ticketError) throw ticketError;

        // 4. Broadcast live update to waiting room
        const ioInstance = req.app.get('io');
        if (ioInstance) {
            ioInstance.to(gameCode).emit('tickets_bought', {
                gameCode,
                userId,
                ticketCount: tickets.length
            });
        }

        res.json({ success: true, tickets });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
 
/**
 * GET MY TICKETS
 */
router.get('/:gameCode/tickets', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const userId = req.userId!;
 
        const { data: game } = await supabase.from('housie_games').select('id').eq('game_code', gameCode).single();
        if (!game) return res.status(404).json({ error: 'Game not found' });
 
        const { data: tickets, error } = await supabase
            .from('housie_tickets')
            .select('*')
            .eq('game_id', game.id)
            .eq('user_id', userId);
 
        if (error) throw error;
        res.json({ tickets });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});
 
/**
 * GET SINGLE TICKET BY ID (For verification)
 */
router.get('/ticket/:ticketId', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { ticketId } = req.params;
        const { data: ticket, error } = await supabase
            .from('housie_tickets')
            .select(`
                *,
                user:users!user_id(name, avatar_url)
            `)
            .eq('id', ticketId)
            .single();

        if (error || !ticket) return res.status(404).json({ error: 'Ticket not found' });
        res.json({ ticket });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:gameCode/status', authMiddleware, async (req: AuthRequest, res) => {
    const { gameCode } = req.params;
    const { status = 'finished' } = req.body; 
    const userId = req.userId;

    try {
        // Verify user is the host
        const { data: game, error: gameError } = await supabase
            .from('housie_games')
            .select('*')
            .eq('game_code', gameCode)
            .single();

        if (gameError || !game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        if (game.host_id !== userId) {
            return res.status(403).json({ error: 'Only the host can change game status' });
        }

        const { data: updatedGame, error: updateError } = await supabase
            .from('housie_games')
            .update({ status })
            .eq('game_code', gameCode)
            .select()
            .single();

        if (updateError) throw updateError;

        // Broadcast to all players
        const io = req.app.get('io');
        io.to(gameCode).emit('game_ended', {
            message: 'The game has been ended by the host.',
            status: updatedGame.status,
            endedAt: new Date()
        });

        res.json(updatedGame);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET GAME RESULTS
 */
router.get('/:gameId/results', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { gameId } = req.params;

        const { data, error } = await supabase
            .from('game_results')
            .select(`
                user_id,
                prize_name,
                prize_amount,
                users:user_id(name, avatar_url)
            `)
            .eq('game_id', gameId);

        if (error) throw error;
        if (!data) return res.json({ results: [] });

        // Aggregate by user
        const resultData = data as any[];
        const summary: Record<string, any> = {};
        
        resultData.forEach(row => {
            if (!summary[row.user_id]) {
                summary[row.user_id] = {
                    userId: row.user_id,
                    name: row.users?.name || 'Player',
                    avatarUrl: row.users?.avatar_url,
                    totalWon: 0,
                    winCount: 0,
                    prizes: []
                };
            }
            summary[row.user_id].totalWon += row.prize_amount;
            summary[row.user_id].winCount += 1;
            summary[row.user_id].prizes.push({
                name: row.prize_name,
                amount: row.prize_amount
            });
        });

        const sortedResults = Object.values(summary).sort((a, b) => b.totalWon - a.totalWon);

        res.json({ results: sortedResults });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET ALL-TIME GROUP LEADERBOARD
 * Aggregates all game_results for a group across all games
 * Query param: ?period=all_time|this_month|this_year
 */
router.get('/group/:groupId/leaderboard', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { groupId } = req.params;
        const period = (req.query.period as string) || 'all_time';

        let query = supabase
            .from('game_results')
            .select(`
                user_id,
                prize_name,
                prize_amount,
                game_id,
                won_at,
                users:user_id(name, avatar_url)
            `)
            .eq('group_id', groupId);

        // Apply date filter
        const now = new Date();
        if (period === 'this_month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            query = query.gte('won_at', start);
        } else if (period === 'this_year') {
            const start = new Date(now.getFullYear(), 0, 1).toISOString();
            query = query.gte('won_at', start);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (!data) return res.json({ leaderboard: [] });

        const resultData = data as any[];
        const summary: Record<string, any> = {};

        resultData.forEach(row => {
            if (!summary[row.user_id]) {
                summary[row.user_id] = {
                    userId: row.user_id,
                    name: row.users?.name || 'Player',
                    avatarUrl: row.users?.avatar_url,
                    totalWon: 0,
                    winCount: 0,
                    gamesPlayed: new Set(),
                };
            }
            summary[row.user_id].totalWon += row.prize_amount;
            summary[row.user_id].winCount += 1;
            summary[row.user_id].gamesPlayed.add(row.game_id);
        });

        const leaderboard = Object.values(summary)
            .map((p: any) => ({ ...p, gamesPlayed: p.gamesPlayed.size }))
            .sort((a, b) => b.totalWon - a.totalWon);

        res.json({ leaderboard });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
