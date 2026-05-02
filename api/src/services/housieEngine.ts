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

        // 5. ATOMIC update
        // We already have a lock from the engine (next_call_at was set to null), 
        // so we don't strictly need a second atomic check on called_numbers here,
        // which can be finicky with JSONB array comparisons.
        const { data: updatedGame, error: updateError } = await supabase
            .from('housie_games')
            .update({
                called_numbers: updatedNumbers,
                last_activity_at: now
            })
            .eq('game_code', gameCode)
            .select()
            .single();

        if (updateError || !updatedGame) {
            console.error(`[AutoHost] Update failed for ${gameCode}:`, updateError?.message);
            // Fallback: Reschedule so the game doesn't stall if this was a transient DB error
            await setNextCallTime(gameCode, 5);
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
let engineInterval: NodeJS.Timeout | null = null;

/**
 * Core iteration logic for the background worker.
 */
const runWorkerIteration = async () => {
    try {
        const now = new Date();
        const nowIso = now.toISOString();

        // 1. Process 'starting' -> 'active' transitions
        const { data: startingGames, error: fetchStartingError } = await supabase
            .from('housie_games')
            .select('game_code, activation_at, settings')
            .eq('status', 'starting')
            .lte('activation_at', nowIso);

        if (fetchStartingError) {
            console.error('[HousieEngine] Error fetching starting games:', fetchStartingError.message);
        }

        if (startingGames && startingGames.length > 0) {
            console.log(`[HousieEngine] Found ${startingGames.length} games to activate`);
            for (const game of startingGames) {
                console.log(`[HousieEngine] Attempting to activate game ${game.game_code} (Activation time: ${game.activation_at})`);

                // Atomic update to flip status and lock the transition
                const { data: updatedGame, error: updateError } = await supabase
                    .from('housie_games')
                    .update({
                        status: 'active',
                        last_activity_at: nowIso
                    })
                    .eq('game_code', game.game_code)
                    .eq('status', 'starting')
                    .lte('activation_at', nowIso)
                    .select()
                    .single();

                if (updateError) {
                    console.error(`[HousieEngine] Activation update failed for ${game.game_code}:`, updateError.message);
                    continue;
                }

                if (!updatedGame) {
                    console.log(`[HousieEngine] Game ${game.game_code} already activated by another worker`);
                    continue;
                }

                console.log(`[HousieEngine] Game ${game.game_code} activated successfully`);

                // Notify clients via socket
                if (io) {
                    io.to(game.game_code).emit('game_activated', {
                        gameCode: game.game_code,
                        status: 'active',
                        game: updatedGame
                    });
                }

                // Start auto host if mode is auto and not paused
                const callingMode = updatedGame.settings?.callingMode || 'manual';
                const isPaused = updatedGame.settings?.isPaused || false;

                if (callingMode === 'auto' && !isPaused) {
                    const interval = updatedGame.settings?.autoCallSeconds || 7;
                    console.log(`[HousieEngine] Initializing auto-call for ${game.game_code} in ${interval + 3}s`);
                    await setNextCallTime(game.game_code, interval + 3);
                }
            }
        }

        // 2. Process automatic number calls for active games
        const { data: activeGames, error: fetchActiveError } = await supabase
            .from('housie_games')
            .select('game_code, next_call_at, settings')
            .eq('status', 'active')
            .not('next_call_at', 'is', null)
            .lte('next_call_at', nowIso);

        if (fetchActiveError) {
            console.error('[HousieEngine] Error fetching active games:', fetchActiveError.message);
        }

        if (activeGames && activeGames.length > 0) {
            console.log(`[HousieEngine] Found ${activeGames.length} games scheduled for call`);
            for (const game of activeGames) {
                console.log(`[HousieEngine] Attempting to lock game ${game.game_code} for call (Scheduled: ${game.next_call_at})`);

                // Only process if it's auto-calling mode and not paused
                const { data: lockedGame, error: lockError } = await supabase
                    .from('housie_games')
                    .update({ next_call_at: null })
                    .eq('game_code', game.game_code)
                    .lte('next_call_at', nowIso)
                    .select()
                    .single();

                if (lockError) {
                    console.error(`[HousieEngine] Lock update failed for ${game.game_code}:`, lockError.message);
                    continue;
                }

                if (!lockedGame) {
                    console.log(`[HousieEngine] Game ${game.game_code} already locked by another worker`);
                    continue;
                }

                // Defensive check on settings after lock
                const callingMode = lockedGame.settings?.callingMode || 'manual';
                const isPaused = lockedGame.settings?.isPaused || false;

                if (callingMode !== 'auto' || isPaused) {
                    console.log(`[HousieEngine] Game ${game.game_code} call skipped (Mode: ${callingMode}, Paused: ${isPaused})`);
                    continue;
                }

                console.log(`[HousieEngine] Executing auto-call for ${game.game_code}`);
                await executeAutoCall(lockedGame);
            }
        } else if (Math.random() < 0.1) {
            // Occasional heartbeat log when idle
            console.log(`[HousieEngine] Heartbeat: Worker is polling... (Active Games Selected: ${activeGames?.length || 0})`);
        }

    } catch (err) {
        console.error('[HousieEngine] Critical worker loop error:', err);
    }
};

/**
 * Evaluates whether the engine should be running and starts/stops it accordingly.
 */
const checkAndManageEngine = async () => {
    try {
        const { count, error } = await supabase
            .from('housie_games')
            .select('*', { count: 'exact', head: true })
            .in('status', ['waiting', 'starting', 'active']);

        if (error) {
            console.error('[HousieEngine] Error checking game count:', error.message);
            return;
        }

        const shouldRun = (count || 0) > 0;

        if (shouldRun && !engineInterval) {
            console.log(`[HousieEngine] ${count} game(s) in progress. Starting worker loop...`);
            engineInterval = setInterval(runWorkerIteration, 1000);
        } else if (!shouldRun && engineInterval) {
            console.log('[HousieEngine] No games in progress. Stopping worker loop (idle mode).');
            clearInterval(engineInterval);
            engineInterval = null;
        }
    } catch (err) {
        console.error('[HousieEngine] Failed to manage engine state:', err);
    }
}

/**
 * Background worker that manages game state transitions and time-based events.
 * Listens for Supabase Realtime changes to start/stop the worker loop only when needed.
 */
export const initHousieEngine = () => {
    console.log('[HousieEngine] Initializing background worker with Realtime monitor...');

    // 1. Initial check on startup
    checkAndManageEngine();

    // 2. Listen for any status changes in the housie_games table to wake up or sleep the worker
    supabase
        .channel('housie_engine_monitor')
        .on('postgres_changes', {
            event: '*',
            table: 'housie_games',
            schema: 'public'
        }, (payload) => {
            // Whenever a game's status might have changed, re-evaluate the engine
            checkAndManageEngine();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('[HousieEngine] Realtime monitor subscribed successfully');
            }
        });
};
