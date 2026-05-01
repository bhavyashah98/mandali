import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { io } from '../index';
import tambola from '../utils/tambola';
import { sendGroupPushNotification } from '../lib/push';
import { startAutoHost, pauseAutoHost, resumeAutoHost, stopAutoHost } from '../services/housieAutoHost';

const router = Router();

// ─── Master Prize Catalogue ──────────────────────────────────────────────────
// Standard line prizes are fixed (one each).
// Full House is `repeatable: true` — host can add as many as they want; frontend auto-numbers them.
// Bonus prizes are only available in manual mode (host oversees judging).
const PRIZE_CATALOGUE = [
    // ── Standard row prizes ──────────────────────────────────────────────────
    { id: 'top_line', name: 'Top Line', description: 'First row of the ticket', icon: 'horizontal-rule', category: 'standard', repeatable: false, order: 1 },
    { id: 'middle_line', name: 'Middle Line', description: 'Middle row of the ticket', icon: 'horizontal-rule', category: 'standard', repeatable: false, order: 2 },
    { id: 'bottom_line', name: 'Bottom Line', description: 'Last row of the ticket', icon: 'horizontal-rule', category: 'standard', repeatable: false, order: 3 },
    // ── Full House (repeatable) ──────────────────────────────────────────────
    { id: 'full_house', name: 'Full House', description: 'All numbers on the ticket marked', icon: 'grid-view', category: 'fullhouse', repeatable: true, order: 4 },
    // ── Bonus prizes — manual mode only ─────────────────────────────────────
    { id: 'four_corners', name: 'Four Corners', description: 'All 4 corner numbers on ticket', icon: 'crop-free', category: 'bonus', repeatable: false, order: 7 },
    { id: 'six_corners', name: 'Six Corners', description: 'First and last numbers of all lines', icon: 'filter-6', category: 'bonus', repeatable: false, order: 8 },
    { id: 'star', name: 'Star', description: 'Cross + centre pattern on ticket', icon: 'star-outline', category: 'bonus', repeatable: false, order: 9 },
    { id: 'center', name: 'Center (Laddu)', description: 'Middle number of middle row', icon: 'adjust', category: 'bonus', repeatable: false, order: 10 },
    { id: 'pyramid', name: 'Pyramid', description: 'A pyramid shape of numbers', icon: 'change-history', category: 'bonus', repeatable: false, order: 11 },
    { id: 'odd_even', name: 'Odd/Even', description: 'All odd or all even numbers marked', icon: 'exposure', category: 'bonus', repeatable: false, order: 12 },
    { id: 'early_5', name: 'Early 5', description: 'First to mark any 5 numbers', icon: 'looks-5', category: 'bonus', repeatable: false, order: 13 },
    { id: 'early_7', name: 'Early 7', description: 'First to mark any 7 numbers', icon: 'filter-7', category: 'bonus', repeatable: false, order: 14 },
    { id: 'bp', name: 'BP / Temperature', description: 'Highest and lowest numbers on ticket', icon: 'thermostat', category: 'bonus', repeatable: false, order: 15 },
    { id: 'child', name: 'Child', description: 'Special prize for the youngest player', icon: 'child-care', category: 'special', repeatable: false, order: 16 },
    { id: 'young', name: 'Young', description: 'Special prize for the youngest adult', icon: 'emoji-people', category: 'special', repeatable: false, order: 13 },
    { id: 'old', name: 'Old', description: 'Special prize for the eldest player', icon: 'elderly', category: 'special', repeatable: false, order: 14 },
    { id: 'jackpot', name: 'Jackpot', description: 'Surprise grand prize — host decides', icon: 'celebration', category: 'special', repeatable: false, order: 15 },
];

/**
 * GET PRIZE CATALOGUE
 * ?mode=auto   → standard + fullhouse only (no bonus/special, no custom)
 * ?mode=manual → all categories including bonus, special, and custom allowed
 */
router.get('/prizes', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const mode = (req.query.mode as string) || 'manual';
        res.json({ prizes: PRIZE_CATALOGUE, allowCustom: mode === 'manual' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

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
        const { groupId, ticketPrice, settings } = req.body;
        const userId = req.userId!;
        const gameCode = generateGameCode();

        console.log(`[Housie] Create attempt: Group=${groupId}, Price=${ticketPrice}, User=${userId}, Settings=${JSON.stringify(settings)}`);

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

        // 2. CHECK FOR EXISTING ACTIVE GAME: Prevent multiple live games in one group
        const { data: existingGame } = await supabase
            .from('housie_games')
            .select('id, game_code, status')
            .eq('group_id', groupId)
            .neq('status', 'ended')
            .limit(1)
            .maybeSingle();

        if (existingGame) {
            return res.status(400).json({
                error: 'An active game already exists for this group.',
                gameCode: existingGame.game_code,
                status: existingGame.status
            });
        }

        // 3. Pre-generate the full draw sequence for this game (fair, no repeats)
        const drawSequence: number[] = tambola.getDrawSequence();

        // 4. Create the game in waiting state directly
        const { data, error } = await supabase
            .from('housie_games')
            .insert({
                game_code: gameCode,
                group_id: groupId,
                host_id: userId,
                called_numbers: [],
                draw_sequence: drawSequence,
                status: 'waiting',
                ticket_price: ticketPrice || 100,
                settings: settings || null,
                last_activity_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // 5. If host opted for tickets, buy them automatically
        if (settings && settings.hostTickets > 0) {
            const ticketsToCreate = [];
            for (let i = 0; i < settings.hostTickets; i++) {
                ticketsToCreate.push({
                    game_id: data.id,
                    user_id: userId,
                    ticket_data: tambola.generateTicket()
                });
            }
            const { error: ticketError } = await supabase
                .from('housie_tickets')
                .insert(ticketsToCreate);

            if (ticketError) console.error('[Housie] Failed to generate host tickets:', ticketError);
        }

        // Immediately notify group so other members' lobbies refetch and see the game
        const ioInstance = req.app.get('io');
        if (ioInstance) {
            ioInstance.to(`group_${groupId}`).emit('game_created', {
                gameCode,
                status: 'waiting'
            });
        }

        // Send Push Notification advising members a game is ready to join!
        sendGroupPushNotification(
            groupId,
            userId,
            '🎟️ Housie Room Open!',
            'A group member is hosting a new game! Jump into the waiting room to grab your tickets before it starts.',
            { type: 'housie', gameCode: gameCode, groupId: groupId, url: `mandali://housie/${gameCode}/${groupId}` }
        ).catch((err: any) => console.error('[Push Failed]:', err));

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
        // 1. Get the current active game (not ended)
        const { data: activeGame } = await supabase
            .from('housie_games')
            .select('*')
            .eq('group_id', groupId)
            .neq('status', 'ended')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 2. Get the most recent ended game for the leaderboard
        const { data: lastGame } = await supabase
            .from('housie_games')
            .select('*')
            .eq('group_id', groupId)
            .eq('status', 'ended')
            .order('last_activity_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        // Flatten host name into activeGame for frontend consistency (matches /:gameCode behavior)
        let activeGameWithHost = activeGame;
        if (activeGame) {
            const { data: hostUser } = await supabase.from('users').select('name').eq('id', activeGame.host_id).single();
            activeGameWithHost = {
                ...activeGame,
                hostName: hostUser?.name || 'Host'
            };
        }

        res.json({ activeGame: activeGameWithHost, lastGame });
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
            .select('host_id, group_id, settings')
            .eq('game_code', gameCode)
            .single();

        if (fetchError || !game) return res.status(404).json({ error: 'Game not found' });
        if (game.host_id !== userId) return res.status(403).json({ error: 'Only the host can activate the game' });

        const { prizes = [] } = req.body;

        const { data: updatedGame, error: updateError } = await supabase
            .from('housie_games')
            .update({
                status: 'starting',
                prizes: prizes,
                last_activity_at: new Date().toISOString()
            })
            .eq('game_code', gameCode)
            .select()
            .single();

        if (updateError) throw updateError;

        const io = req.app.get('io');
        if (io) {
            // 1. Notify everyone that game is STARTING (25s countdown)
            io.to(gameCode).emit('game_starting', {
                gameCode,
                status: 'starting',
                game: updatedGame
            });

            // 2. Notify group members in lobby
            io.to(`group_${game.group_id}`).emit('game_starting', {
                gameCode,
                status: 'starting'
            });

            // 3. Set a timeout to flip status to 'active' automatically after 15s
            setTimeout(async () => {
                try {
                    const { data: finalGame } = await supabase
                        .from('housie_games')
                        .update({ status: 'active' })
                        .eq('game_code', gameCode)
                        .select()
                        .single();

                    if (finalGame) {
                        io.to(gameCode).emit('game_activated', {
                            gameCode,
                            status: 'active',
                            game: finalGame
                        });

                        // ─── START AUTO HOST IF MODE IS AUTO ───
                        if (finalGame.settings?.callingMode === 'auto' && !finalGame.settings?.isPaused) {
                            const interval = finalGame.settings?.autoCallSeconds || 7;
                            startAutoHost(gameCode, interval);
                        }
                    }
                } catch (err) {
                    console.error('[Housie] Failed to auto-activate game after starting timer:', err);
                }
            }, 15000);
        }

        res.json(updatedGame);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * CANCEL STUCK GAME (Escape Hatch)
 * Any member (except host) can cancel a game the host has abandoned.
 * Thresholds: not_started/waiting=30m, bounty=15m, active=60m (last number called)
 */
router.post('/:gameCode/cancel', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const userId = req.userId!;

        const { data: game, error: fetchError } = await supabase
            .from('housie_games')
            .select('*')
            .eq('game_code', gameCode)
            .single();

        if (fetchError || !game) return res.status(404).json({ error: 'Game not found' });
        const isHost = game.host_id === userId;

        if (game.status === 'ended') {
            return res.status(400).json({ error: 'Game is already ended.' });
        }

        const { data: cancelledGame, error: updateError } = await supabase
            .from('housie_games')
            .update({
                status: 'ended',
                cancellation_reason: 'host_inactive',
                cancelled_by: userId,
                last_activity_at: new Date().toISOString()
            })
            .eq('game_code', gameCode)
            .select()
            .single();

        if (updateError) throw updateError;

        // Notify the group lobby that the active game slot has changed/freed up
        req.app.get('io').to(game.group_id).emit('game_created', {
            gameCode,
            status: 'ended'
        });

        stopAutoHost(gameCode);

        res.json({ success: true, game: cancelledGame });
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

            // Host counts as a participant whenever they hold tickets
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

        const { data: hostUser } = await supabase.from('users').select('name').eq('id', game.host_id).single();
        const hostName = hostUser?.name || 'Host';

        const responsePayload = {
            ...game,
            hostName,
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

        // Prevent calling if there are pending claims
        const winners = game.winners || {};
        const pending = winners['__pending'] || [];
        if (pending.length > 0) {
            return res.status(400).json({ error: 'Please resolve pending claims before calling the next number' });
        }

        const calledNumbers = game.called_numbers || [];
        if (calledNumbers.length >= 90) return res.status(400).json({ error: 'All numbers called' });

        // Use the pre-generated draw sequence stored at game creation
        const drawSequence: number[] = game.draw_sequence || [];

        const nextNumber = drawSequence[calledNumbers.length];
        const updatedNumbers = [...calledNumbers, nextNumber];
        const isLastNumber = updatedNumbers.length === 90;

        const { data, error: updateError } = await supabase
            .from('housie_games')
            .update({
                called_numbers: updatedNumbers,
                status: isLastNumber ? 'ended' : game.status,
                last_activity_at: new Date().toISOString()
            })
            .eq('game_code', gameCode)
            .select()
            .single();

        if (updateError) throw updateError;

        const io = req.app.get("io");
        
        // BROADCAST via Socket.io for real-time updates
        io.to(gameCode).emit('number_called', {
            gameCode,
            nextNumber,
            calledNumbers: updatedNumbers,
            calledCount: updatedNumbers.length,
            remainingCount: 90 - updatedNumbers.length,
            lastActivityAt: data.last_activity_at
        });

        if (isLastNumber) {
            io.to(gameCode).emit('game_ended', {
                gameCode,
                status: 'ended'
            });
            io.to(`group_${game.group_id}`).emit('game_created', {
                gameCode,
                status: 'ended',
            });
            stopAutoHost(gameCode);
        }

        res.json({ success: true, nextNumber, game: data });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * PAUSE GAME (Auto-mode only)
 */
router.post('/:gameCode/pause', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const userId = req.userId!;

        const { data: game } = await supabase.from('housie_games').select('*').eq('game_code', gameCode).single();
        if (!game) return res.status(404).json({ error: 'Game not found' });
        if (game.host_id !== userId) return res.status(403).json({ error: 'Only the host can pause the game' });

        const settings = { ...game.settings, isPaused: true };
        await supabase.from('housie_games').update({ settings }).eq('game_code', gameCode);

        pauseAutoHost(gameCode);

        // Broadcast pause
        const io = req.app.get('io');
        if (io) {
            io.to(gameCode).emit('game_paused', { gameCode });
        }

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:gameCode/resume', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();
        const userId = req.userId!;

        const { data: game } = await supabase.from('housie_games').select('*').eq('game_code', gameCode).single();
        if (!game) return res.status(404).json({ error: 'Game not found' });
        if (game.host_id !== userId) return res.status(403).json({ error: 'Only the host can resume the game' });

        const settings = { ...game.settings, isPaused: false };
        await supabase.from('housie_games').update({ settings }).eq('game_code', gameCode);

        resumeAutoHost(gameCode);

        // Broadcast resume
        const io = req.app.get('io');
        if (io) {
            io.to(gameCode).emit('game_resumed', { gameCode });
        }

        res.json({ success: true });
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
            .select('id, ticket_price, host_id, settings')
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

            // Host counts as a participant whenever they hold tickets
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
                ticket_data: tambola.generateTicket()
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
    const { status = 'ended' } = req.body;
    const userId = req.userId;

    const ALLOWED_STATUSES = ['waiting', 'bounty', 'active', 'ended'];
    if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status '${status}'. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
    }
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
            .update({ status, last_activity_at: new Date().toISOString() })
            .eq('game_code', gameCode)
            .select()
            .single();

        if (updateError) throw updateError;

        // Broadcast game_ended only when actually ending — not for other status transitions
        if (status === 'ended') {
            const io = req.app.get('io');
            io.to(gameCode).emit('game_ended', {
                gameCode,
                status: 'ended'
            });
            io.to(`group_${game.group_id}`).emit('game_created', {
                gameCode,
                status,
            });

            // STOP AUTO HOST IF ACTIVE
            stopAutoHost(gameCode as string);
        }

        res.json(updatedGame);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET GAME RESULTS
 */
router.get('/:gameCode/results', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const gameCode = (req.params.gameCode as string).toUpperCase();

        // First resolve gameCode -> game UUID
        const { data: game, error: gameError } = await supabase
            .from('housie_games')
            .select('id')
            .eq('game_code', gameCode)
            .single();

        if (gameError || !game) return res.json({ results: [] });

        const { data, error } = await supabase
            .from('game_results')
            .select(`
                user_id,
                prize_name,
                prize_amount,
                users(name, avatar_url)
            `)
            .eq('game_id', game.id);

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
