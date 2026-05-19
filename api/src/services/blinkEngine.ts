import { Server } from 'socket.io';
import { supabase } from '../lib/supabase';
import { activeBlinkGames, InMemoryBlinkPlayer, InMemoryBlinkGame } from './blinkMemory';
import { io } from '../index';
import { sendGroupPushNotification } from '../lib/push';

// Track in-progress timers so we don't double-schedule
const pendingActivations = new Map<string, NodeJS.Timeout>();
const activeTimers = new Map<string, NodeJS.Timeout>();
const reminderTimers = new Map<string, NodeJS.Timeout>();

/**
 * Schedules the automatic activation of a Blink game after the countdown expires.
 * Called from the start route immediately after setting status = 'starting'.
 */
export const scheduleBlinkActivation = async (io: Server, gameId: string, delayMs: number) => {
    // Clear any existing timer for this game (safety guard)
    const existing = pendingActivations.get(gameId);
    if (existing) {
        clearTimeout(existing);
    }

    const timer = setTimeout(async () => {
        pendingActivations.delete(gameId);
        await activateBlinkGame(io, gameId);
    }, delayMs);

    pendingActivations.set(gameId, timer);
    console.log(`[BlinkEngine] Scheduled activation for game ${gameId} in ${delayMs / 1000}s`);
};

/**
 * Cancels any pending activation timer for a game (e.g., if the host cancels).
 */
export const cancelBlinkActivation = (gameId: string) => {
    const existing = pendingActivations.get(gameId);
    if (existing) {
        clearTimeout(existing);
        pendingActivations.delete(gameId);
        console.log(`[BlinkEngine] Cancelled activation for game ${gameId}`);
    }
};

/**
 * Cancels active start and reminder timers for scheduled games.
 */
export const cancelScheduledBlinkGame = (gameCode: string) => {
    const code = gameCode.toUpperCase();
    if (activeTimers.has(code)) {
        clearTimeout(activeTimers.get(code));
        activeTimers.delete(code);
        console.log(`[BlinkEngine] [${code}] Cleared active start timer.`);
    }
    if (reminderTimers.has(code)) {
        clearTimeout(reminderTimers.get(code));
        reminderTimers.delete(code);
        console.log(`[BlinkEngine] [${code}] Cleared reminder timer.`);
    }
};

/**
 * Transitions a game from 'scheduled' to 'starting' and preloads RAM caches.
 */
export const transitionBlinkGameToStarting = async (gameCode: string, groupId: string, hostId: string) => {
    const code = gameCode.toUpperCase();
    try {
        console.log(`[BlinkEngine] [${code}] Transitioning scheduled game to starting...`);

        // 1. Fetch current game state
        const { data: game, error: fetchError } = await supabase
            .from('blink_games')
            .select('*')
            .eq('game_code', code)
            .single();

        if (fetchError || !game) {
            console.error(`[BlinkEngine] [${code}] Transition failed: Game not found.`, fetchError);
            return;
        }

        // 2. Fetch participants
        const { data: participants } = await supabase
            .from('blink_players')
            .select('user_id, users(name, avatar_url)')
            .eq('game_id', game.id);

        if (!participants || participants.length < 1) {
            console.warn(`[BlinkEngine] [${code}] Scheduled start aborted: No participants joined.`);
            cancelScheduledBlinkGame(code);
            return;
        }

        const now = new Date();
        const delaySeconds = 60; // 60s countdown for scheduled game starting
        const activationTime = new Date(now.getTime() + delaySeconds * 1000);

        const totalPlayers = participants.length;
        const totalPrizePool = totalPlayers * 100;
        let prizes: any[] = [];

        // Exact same dynamic prizes calculation as start route
        if (totalPlayers === 1) {
            prizes = [{ id: '1st', name: '1st Place', description: 'Fastest matcher', percentage: 20, amount: Math.floor(totalPrizePool * 0.20), icon: 'emoji-events' }];
        } else if (totalPlayers <= 2) {
            prizes = [{ id: '1st', name: '1st Place', description: 'Fastest matcher', percentage: 50, amount: Math.floor(totalPrizePool * 0.50), icon: 'emoji-events' }];
        } else {
            const W = totalPlayers - 1;
            let weights: number[] = [];
            let totalWeight = 0;
            for (let r = 1; r <= W; r++) {
                const weight = Math.pow(W - r + 1, 1.4);
                weights.push(weight);
                totalWeight += weight;
            }

            let percentages = weights.map(w => Math.round((w / totalWeight) * 100));

            const currentSum = percentages.reduce((sum, p) => sum + p, 0);
            const diff = 100 - currentSum;
            if (diff !== 0) {
                percentages[0] += diff;
            }

            prizes = percentages.map((pct, idx) => {
                const rank = idx + 1;
                let suffix = 'th';
                if (rank === 1) suffix = 'st';
                else if (rank === 2) suffix = 'nd';
                else if (rank === 3) suffix = 'rd';

                const idStr = `${rank}${suffix}`;
                
                let description = 'Rank finished';
                if (rank === 1) description = 'Fastest matcher';
                else if (rank === 2) description = 'Runner up';
                else if (rank === 3) description = 'Second runner up';

                let icon = 'stars';
                if (rank === 1) icon = 'emoji-events';
                else if (rank === 2 || rank === 3) icon = 'military-tech';

                return {
                    id: idStr,
                    name: `${idStr} Place`,
                    description,
                    percentage: pct,
                    amount: Math.floor(totalPrizePool * (pct / 100)),
                    icon
                };
            });
        }

        // 3. Update Database status to starting
        const { error: updateError } = await supabase
            .from('blink_games')
            .update({
                status: 'starting',
                prizes: prizes,
                starting_at: now.toISOString(),
                activation_at: activationTime.toISOString()
            })
            .eq('id', game.id)
            .eq('status', 'scheduled');

        if (updateError) {
            console.error(`[BlinkEngine] [${code}] Transition DB update failed:`, updateError);
            return;
        }

        // 4. Preload and Schedule activation
        scheduleBlinkActivation(io, game.id, delaySeconds * 1000);
        await preloadBlinkGame(game.id);

        // 5. Emit Socket events
        if (io) {
            io.to(code).emit('blink_game_starting', { gameCode: code });
            io.to(`group_${groupId}`).emit('blink_game_starting', { gameCode: code, groupId });
        }

        // 6. Push notification
        sendGroupPushNotification(
            groupId,
            hostId,
            '⚡ Blink Match Starting!',
            `The scheduled Blink match "${game.title || 'Blink'}" is starting now. Join the waiting room!`,
            { type: 'blink', gameCode: code, groupId, url: `mandali://blink/${code}/${groupId}` }
        ).catch(err => console.error(`[BlinkEngine] [${code}] Failed to send start notification:`, err));

        cancelScheduledBlinkGame(code);

    } catch (err) {
        console.error(`[BlinkEngine] [${code}] Error in transitionBlinkGameToStarting:`, err);
    }
};

/**
 * Schedules a game to move from 'scheduled' to 'starting' at the right time.
 */
export const scheduleBlinkGameStart = (gameCode: string, scheduledAt: string, groupId: string, hostId: string, title?: string) => {
    if (!scheduledAt) return;

    const code = gameCode.toUpperCase();
    cancelScheduledBlinkGame(code);

    const startTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    const delay = Math.max(0, startTime - now);

    console.log(`[BlinkEngine] [${code}] Scheduled start in ${Math.round(delay / 1000 / 60)} mins (UTC: ${scheduledAt}).`);

    // 1. Reminder Timer (5 minutes before)
    const fiveMinInMs = 5 * 60 * 1000;
    const reminderDelay = Math.max(0, delay - fiveMinInMs);

    if (delay > 30000) {
        const rTimer = setTimeout(async () => {
            console.log(`[BlinkEngine] [${code}] Sending pre-game reminder.`);
            sendGroupPushNotification(
                groupId,
                hostId,
                delay > (fiveMinInMs + 10000) ? '🕒 5 Minutes Left!' : '⚡ Blink Starting Soon!',
                `The Blink match "${title || 'Blink'}" is starting ${delay > (fiveMinInMs + 10000) ? 'in 5 minutes' : 'very soon'}. Join now!`,
                { type: 'blink', gameCode: code, groupId }
            ).catch(err => console.error(`[BlinkEngine] [${code}] Failed to send reminder:`, err));
            reminderTimers.delete(code);
        }, reminderDelay);
        reminderTimers.set(code, rTimer);
    }

    // 2. Exact Start Timer
    const timer = setTimeout(() => {
        transitionBlinkGameToStarting(code, groupId, hostId);
    }, delay);

    activeTimers.set(code, timer);
};

/**
 * Initializer for Scheduled Blink Games engine
 */
export const initBlinkEngine = async () => {
    console.log('[BlinkEngine] Initializing Production Blink Engine...');

    try {
        // 1. Sync all scheduled games into memory timeouts on start
        const { data: scheduled } = await supabase
            .from('blink_games')
            .select('game_code, scheduled_at, group_id, host_id, title')
            .eq('status', 'scheduled');
        
        if (scheduled) {
            scheduled.forEach(g => {
                scheduleBlinkGameStart(g.game_code, g.scheduled_at, g.group_id, g.host_id, g.title);
            });
        }

        // 2. Proactive check for games that reached their start time (safety check for system restarts)
        const nowIso = new Date().toISOString();
        const { data: missedGames } = await supabase
            .from('blink_games')
            .select('game_code, group_id, host_id')
            .eq('status', 'scheduled')
            .lte('scheduled_at', nowIso);

        if (missedGames?.length) {
            console.log(`[BlinkEngine] Found ${missedGames.length} missed scheduled starts. Transitioning...`);
            for (const g of missedGames) {
                await transitionBlinkGameToStarting(g.game_code, g.group_id, g.host_id);
            }
        }

    } catch (err) {
        console.error('[BlinkEngine] Unexpected error during initialization:', err);
    }
};

/**
 * Preloads a game's cards and players in RAM cache when the status becomes 'starting'.
 * This completely avoids all database delays during the transition from countdown to active!
 */
export const preloadBlinkGame = async (gameId: string): Promise<InMemoryBlinkGame | null> => {
    try {
        console.log(`[BlinkEngine] Preloading game ${gameId} to RAM cache...`);

        // 1. Fetch game
        const { data: game, error: gameError } = await supabase
            .from('blink_games')
            .select('*')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            console.error(`[BlinkEngine Preload] Game not found: ${gameId}`);
            return null;
        }

        // 2. Fetch participants with names
        const { data: participants } = await supabase
            .from('blink_players')
            .select('user_id, users(name)')
            .eq('game_id', game.id);

        if (!participants || participants.length < 1) {
            console.error(`[BlinkEngine Preload] No participants for game ${gameId}`);
            return null;
        }

        // 3. Fetch and shuffle cards
        const { data: cards } = await supabase
            .from('blink_cards')
            .select('id, symbols')
            .eq('symbols_per_card', game.symbols_per_card);

        if (!cards || cards.length === 0) {
            console.error(`[BlinkEngine Preload] No cards found for game ${gameId}`);
            return null;
        }

        const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
        const initialCenterCard = shuffledCards.pop()!;

        const playerUpdates = participants.map(p => {
            const firstCard = shuffledCards.pop()!;
            return {
                userId: p.user_id,
                name: (p as any).users?.name || 'Player',
                currentCardId: firstCard.id,
                currentCardSymbols: firstCard.symbols,
                cardsRemaining: game.cards_per_player - 1
            };
        });

        // Save generated cards to Database immediately during preload to avoid game-over screen flickering on frontend
        await supabase
            .from('blink_games')
            .update({
                current_center_card: initialCenterCard.id
            })
            .eq('id', game.id);

        for (const p of playerUpdates) {
            await supabase
                .from('blink_players')
                .update({
                    cards_remaining: p.cardsRemaining,
                    current_card_id: p.currentCardId
                })
                .eq('game_id', game.id)
                .eq('user_id', p.userId);
        }

        // 4. Construct memory structure
        const playersMap = new Map<string, InMemoryBlinkPlayer>();
        playerUpdates.forEach(p => {
            playersMap.set(p.userId, {
                userId: p.userId,
                name: p.name,
                currentCardId: p.currentCardId,
                currentCardSymbols: p.currentCardSymbols,
                cardsRemaining: p.cardsRemaining
            });
        });

        const inMemoryGame: InMemoryBlinkGame = {
            id: game.id,
            groupId: game.group_id,
            gameCode: game.game_code.toUpperCase(),
            status: 'starting', // Set to starting initially, will be flipped to 'active' on activation
            symbolsPerCard: game.symbols_per_card,
            cardsPerPlayer: game.cards_per_player,
            prizes: game.prizes || [],
            currentCenterCardId: initialCenterCard.id,
            currentCenterCardSymbols: initialCenterCard.symbols,
            players: playersMap,
            deck: shuffledCards.map(c => ({ id: c.id, symbols: c.symbols })),
            winnersCount: 0
        };

        activeBlinkGames.set(game.game_code.toUpperCase(), inMemoryGame);
        console.log(`[Blink Memory] 🚀 Successfully preloaded game "${game.game_code.toUpperCase()}" with ${inMemoryGame.deck.length} remaining cards in RAM.`);
        return inMemoryGame;
    } catch (error) {
        console.error(`[BlinkEngine Preload] Unexpected error preloading game ${gameId}:`, error);
        return null;
    }
};

/**
 * Activates the game: distributes cards, sets status to 'active', emits socket events.
 */
const activateBlinkGame = async (io: Server, gameId: string) => {
    try {
        console.log(`[BlinkEngine] Activating game ${gameId}`);

        // 1. Fetch game
        const { data: game, error: gameError } = await supabase
            .from('blink_games')
            .select('*')
            .eq('id', gameId)
            .single();

        if (gameError || !game) {
            console.error(`[BlinkEngine] Game not found: ${gameId}`);
            return;
        }

        if (game.status !== 'starting') {
            console.log(`[BlinkEngine] Game ${gameId} is no longer in 'starting' state (${game.status}), skipping.`);
            return;
        }

        const gameCode = game.game_code.toUpperCase();
        let inMemoryGame: InMemoryBlinkGame | null | undefined = activeBlinkGames.get(gameCode);

        // Fallback: If not preloaded during the countdown phase, preload it now
        if (!inMemoryGame) {
            console.log(`[BlinkEngine] Game ${gameCode} was not preloaded in memory. Loading now...`);
            inMemoryGame = await preloadBlinkGame(gameId);
        }

        if (!inMemoryGame) {
            console.error(`[BlinkEngine] Failed to load/preload game ${gameCode}`);
            return;
        }

        // Flip status to active in RAM immediately
        inMemoryGame.status = 'active';

        // Prepare info for persistence from preloaded structures
        const centerCardId = inMemoryGame.currentCenterCardId;
        const playerUpdates = Array.from(inMemoryGame.players.values()).map(p => ({
            userId: p.userId,
            currentCardId: p.currentCardId,
            cardsRemaining: p.cardsRemaining
        }));

        console.log(`[Blink Memory] 🚀 Activating game ${gameCode} in RAM and asynchronously syncing to Database...`);

        // 5. Update game status to active in DB
        const { error: updateError } = await supabase
            .from('blink_games')
            .update({
                status: 'active',
                current_center_card: centerCardId,
                started_at: new Date().toISOString()
            })
            .eq('id', gameId);

        if (updateError) {
            console.error(`[BlinkEngine] Failed to activate game ${gameId}:`, updateError);
            return;
        }

        // 6. Assign cards to players in DB
        for (const p of playerUpdates) {
            await supabase
                .from('blink_players')
                .update({
                    cards_remaining: p.cardsRemaining,
                    current_card_id: p.currentCardId
                })
                .eq('game_id', game.id)
                .eq('user_id', p.userId);
        }

        // 7. Broadcast to all clients
        io.to(gameCode).emit('blink_game_started', { gameCode: game.game_code });
        io.to(`group_${game.group_id}`).emit('blink_game_started', { gameCode: game.game_code, groupId: game.group_id });

        console.log(`[BlinkEngine] Game ${gameId} (${game.game_code}) is now ACTIVE`);
    } catch (error) {
        console.error(`[BlinkEngine] Unexpected error activating game ${gameId}:`, error);
    }
};
