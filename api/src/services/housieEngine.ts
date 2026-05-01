import { supabase } from '../lib/supabase';
import { io } from '../index';

/**
 * Updates the database with the timestamp for the next automatic number call.
 */
export const setNextCallTime = async (gameCode: string, intervalSeconds: number) => {
    const nextCallAt = new Date(Date.now() + intervalSeconds * 1000);

    const { error } = await supabase
        .from('housie_games')
        .update({
            next_call_at: nextCallAt.toISOString(),
            last_activity_at: new Date().toISOString()
        })
        .eq('game_code', gameCode);

    if (error) {
        console.error(`[HousieEngine] Failed to set next_call_at for ${gameCode}:`, error);
    } else {
        console.log(`[HousieEngine] Next call for ${gameCode} scheduled at ${nextCallAt.toISOString()}`);
    }
};

/**
 * Fully worker-driven, atomic auto call execution.
 * Uses the pre-fetched 'lockedGame' from the engine to perform the call.
 */
export const executeAutoCall = async (game: any) => {
    try {
        const gameCode = game.game_code;
        const now = new Date().toISOString();

        // 1. Validate state (defensive)
        if (game.status !== 'active') return;

        if (
            game.settings?.callingMode !== 'auto' ||
            game.settings?.isPaused
        ) {
            return;
        }

        // 2. Handle pending claims
        const winners = game.winners || {};
        const pending = winners['__pending'] || [];

        if (pending.length > 0) {
            console.log(`[AutoHost] Pending claims for ${gameCode}, rescheduling...`);
            // Only schedule if not already scheduled
            if (!game.next_call_at) {
                await setNextCallTime(gameCode, 2);
            }
            return;
        }

        const calledNumbers: number[] = game.called_numbers || [];

        // 3. End condition
        if (calledNumbers.length >= 90) {
            await supabase
                .from('housie_games')
                .update({
                    status: 'ended',
                    last_activity_at: now
                })
                .eq('game_code', gameCode);

            if (io) {
                io.to(gameCode).emit('game_ended', {
                    gameCode,
                    status: 'ended'
                });
            }
            return;
        }

        // 4. Get next number safely
        const drawSequence: number[] = game.draw_sequence || [];
        const nextNumber = drawSequence[calledNumbers.length];

        if (nextNumber === undefined || nextNumber === null) {
            console.error(`[AutoHost] Invalid draw sequence or out of bounds for ${gameCode}. Called: ${calledNumbers.length}, Sequence: ${drawSequence.length}`);
            return;
        }

        const updatedNumbers = [...calledNumbers, nextNumber];
        const isLastNumber = updatedNumbers.length === 90;

        // 5. ATOMIC update (critical)
        const { data: updatedGame, error: updateError } = await supabase
            .from('housie_games')
            .update({
                called_numbers: updatedNumbers,
                last_activity_at: now
            })
            .eq('game_code', gameCode)
            .eq('called_numbers', calledNumbers) // 🔥 atomic condition
            .select()
            .single();

        if (!updatedGame || updateError) {
            console.log(`[AutoHost] Atomic update failed for ${gameCode} (likely already handled)`);
            return;
        }

        // 6. Emit minimal payload
        if (io) {
            io.to(gameCode).emit('number_called', {
                gameCode,
                nextNumber,
                calledNumbers: updatedNumbers,
                calledCount: updatedNumbers.length,
                remainingCount: 90 - updatedNumbers.length,
                lastActivityAt: updatedGame.last_activity_at
            });

            // 7. Handle 90th number (stop calling, but don't end)
            if (isLastNumber) {
                console.log(`[AutoHost] All 90 numbers called for ${gameCode}. Waiting for host to end game.`);
                return;
            }
        }

        // 8. Schedule next call via DB
        const interval = game.settings?.autoCallSeconds || 7;
        await setNextCallTime(gameCode, interval);

    } catch (err) {
        console.error(`[AutoHost] Critical failure in executeAutoCall for ${game?.game_code}:`, err);

        // Retry fallback
        if (game?.game_code) {
            await setNextCallTime(game.game_code, 5);
        }
    }
};

/**
 * Background worker that manages game state transitions and time-based events.
 * Currently handles:
 * 1. Activating games that are in 'starting' state once countdown expires.
 * 2. Triggering automatic number calls for active games based on next_call_at.
 */
export const initHousieEngine = () => {
    console.log('[HousieEngine] Initializing background worker...');

    setInterval(async () => {
        try {
            const now = new Date();

            // 1. Process 'starting' -> 'active' transitions
            const { data: startingGames } = await supabase
                .from('housie_games')
                .select('game_code, activation_at')
                .eq('status', 'starting')
                .lte('activation_at', now.toISOString());

            if (startingGames && startingGames.length > 0) {
                for (const game of startingGames) {
                    console.log(`[HousieEngine] Attempting to activate game ${game.game_code}`);

                    // Atomic update to flip status and lock the transition
                    const { data: updatedGame, error: updateError } = await supabase
                        .from('housie_games')
                        .update({
                            status: 'active',
                            last_activity_at: now.toISOString()
                        })
                        .eq('game_code', game.game_code)
                        .eq('status', 'starting')
                        .lte('activation_at', now.toISOString())
                        .select()
                        .single();

                    if (!updatedGame || updateError) {
                        // Another worker already handled it or update failed
                        continue;
                    }

                    // Notify clients via socket
                    if (io) {
                        io.to(game.game_code).emit('game_activated', {
                            gameCode: game.game_code,
                            status: 'active',
                            game: updatedGame
                        });
                    }

                    // Start auto host if mode is auto and not paused
                    if (
                        updatedGame.settings?.callingMode === 'auto' &&
                        !updatedGame.settings?.isPaused
                    ) {
                        const interval = updatedGame.settings.autoCallSeconds || 7;
                        await setNextCallTime(game.game_code, interval + 3); // Extra 3s buffer for first call
                    }
                }
            }

            // 2. Process automatic number calls for active games
            const { data: activeGames } = await supabase
                .from('housie_games')
                .select('game_code, next_call_at, settings')
                .eq('status', 'active')
                .not('next_call_at', 'is', null)
                .lte('next_call_at', now.toISOString());

            if (activeGames && activeGames.length > 0) {
                for (const game of activeGames) {
                    // Only process if it's auto-calling mode and not paused
                    const { data: lockedGame, error: lockError } = await supabase
                        .from('housie_games')
                        .update({ next_call_at: null })
                        .eq('game_code', game.game_code)
                        .lte('next_call_at', now.toISOString())
                        .select()
                        .single();

                    if (!lockedGame || lockError) {
                        continue;
                    }

                    // Defensive check on settings after lock
                    if (lockedGame.settings?.callingMode !== 'auto' || lockedGame.settings?.isPaused) {
                        continue;
                    }
                    
                    await executeAutoCall(lockedGame);
                }
            }

        } catch (err) {
            console.error('[HousieEngine] Worker error:', err);
        }
    }, 1000); // Poll every second
};
