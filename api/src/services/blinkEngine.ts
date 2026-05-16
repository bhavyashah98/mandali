import { Server } from 'socket.io';
import { supabase } from '../lib/supabase';

// Track in-progress timers so we don't double-schedule
const pendingActivations = new Map<string, NodeJS.Timeout>();

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

        // 2. Fetch participants
        const { data: participants } = await supabase
            .from('blink_players')
            .select('user_id')
            .eq('game_id', game.id);

        if (!participants || participants.length < 1) {
            console.error(`[BlinkEngine] No participants for game ${gameId}`);
            return;
        }

        // 3. Fetch and shuffle cards
        const { data: cards } = await supabase
            .from('blink_cards')
            .select('id, symbols')
            .eq('symbols_per_card', game.symbols_per_card);

        if (!cards || cards.length === 0) {
            console.error(`[BlinkEngine] No cards found for game ${gameId}`);
            return;
        }

        const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
        const initialCenterCard = shuffledCards.pop()!;

        const playerUpdates = participants.map(p => {
            const firstCard = shuffledCards.pop()!;
            return {
                userId: p.user_id,
                currentCardId: firstCard.id,
                cardsRemaining: game.cards_per_player - 1
            };
        });

        // 4. Update game status to active
        const { error: updateError } = await supabase
            .from('blink_games')
            .update({
                status: 'active',
                current_center_card: initialCenterCard.id,
                started_at: new Date().toISOString()
            })
            .eq('id', gameId);

        if (updateError) {
            console.error(`[BlinkEngine] Failed to activate game ${gameId}:`, updateError);
            return;
        }

        // 5. Assign cards to players
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

        // 6. Broadcast to all clients
        io.to(game.game_code.toUpperCase()).emit('blink_game_started', { gameCode: game.game_code });
        io.to(`group_${game.group_id}`).emit('blink_game_started', { gameCode: game.game_code, groupId: game.group_id });

        console.log(`[BlinkEngine] Game ${gameId} (${game.game_code}) is now ACTIVE`);
    } catch (error) {
        console.error(`[BlinkEngine] Unexpected error activating game ${gameId}:`, error);
    }
};
