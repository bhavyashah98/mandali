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

            // 7. Handle 90th number (Wait one last interval for final claims before ending)
            if (isLastNumber) {
                const interval = game.settings?.autoCallSeconds || 7;
                console.log(`[AutoHost] 90th number called for ${gameCode}. Scheduling final check before end in ${interval}s`);
                await setNextCallTime(gameCode, interval);
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
 * IN-MEMORY STATE MANAGEMENT
 * We maintain local timers for performance, but the source of truth
 * and locking mechanism remains the Supabase database.
 */
const gameEngines = new Map<string, {
    timer: NodeJS.Timeout | null;
    version: number;
    scheduledFor?: string;
}>();

/**
 * Core activation logic (starting -> active)
 */
const runActivation = async (gameCode: string) => {
    try {
        const nowIso = new Date().toISOString();

        // Atomic update to flip status and lock the transition
        const { data: updatedGame, error: updateError } = await supabase
            .from('housie_games')
            .update({
                status: 'active',
                last_activity_at: nowIso
            })
            .eq('game_code', gameCode)
            .eq('status', 'starting')
            .lte('activation_at', nowIso)
            .select()
            .single();

        if (updateError || !updatedGame) {
            // If the game is no longer 'starting', or was deleted, stop tracking it
            const { data: stillExists } = await supabase
                .from('housie_games')
                .select('status')
                .eq('game_code', gameCode)
                .single();

            if (!stillExists || stillExists.status !== 'starting') {
                gameEngines.delete(gameCode);
            }
            return;
        }

        console.log(`[HousieEngine] Game ${gameCode} activated successfully via timer`);

        // Notify clients
        if (io) {
            io.to(gameCode).emit('game_activated', {
                gameCode,
                status: 'active',
                game: updatedGame
            });
        }

        // START the auto-calling sequence if mode is auto and not paused
        const callingMode = updatedGame.settings?.callingMode || 'manual';
        const isPaused = updatedGame.settings?.isPaused || false;

        if (callingMode === 'auto' && !isPaused) {
            const interval = updatedGame.settings?.autoCallSeconds || 7;
            console.log(`[HousieEngine] Initializing first call for ${gameCode} in ${interval + 3}s`);
            await setNextCallTime(gameCode, interval + 3);
        }
    } catch (err) {
        console.error(`[HousieEngine] Activation failed for ${gameCode}:`, err);
    }
};

/**
 * Core auto-call execution logic
 */
const runAutoCall = async (gameCode: string) => {
    try {
        const nowIso = new Date().toISOString();
        console.log(`[HousieEngine] [DEBUG] runAutoCall triggered for ${gameCode} (Now: ${nowIso})`);

        // 1. Attempt to LOCK this specific time slot in the database
        // This ensures that only ONE server/timer executes this specific call.
        const { data: lockedGame, error: lockError } = await supabase
            .from('housie_games')
            .update({ next_call_at: null })
            .eq('game_code', gameCode)
            .eq('status', 'active')
            .lte('next_call_at', nowIso)
            .select()
            .single();

        if (lockError || !lockedGame) {
            console.log(`[HousieEngine] [DEBUG] Lock FAILED for ${gameCode}. (Error: ${lockError?.message || 'Criteria not met'})`);
            
            const { data: stillExists } = await supabase
                .from('housie_games')
                .select('status, next_call_at')
                .eq('game_code', gameCode)
                .single();

            if (!stillExists) {
                console.log(`[HousieEngine] [DEBUG] Game ${gameCode} not found in DB. Cleaning up.`);
                gameEngines.delete(gameCode);
            } else if (stillExists.status !== 'active') {
                console.log(`[HousieEngine] [DEBUG] Game ${gameCode} status is ${stillExists.status} (expected active). Cleaning up.`);
                gameEngines.delete(gameCode);
            } else if (stillExists.next_call_at && new Date(stillExists.next_call_at) > new Date()) {
                console.log(`[HousieEngine] [DEBUG] Game ${gameCode} next_call_at is in future (${stillExists.next_call_at}). Cleaning up stale timer.`);
                gameEngines.delete(gameCode);
            } else {
                console.log(`[HousieEngine] [DEBUG] Game ${gameCode} is still active and valid, but lock failed (likely handled by another instance).`);
            }
            return;
        }

        console.log(`[HousieEngine] [DEBUG] Lock ACQUIRED for ${gameCode}. Executing draw...`);
        await executeAutoCall(lockedGame);

        // The executeAutoCall will call setNextCallTime, 
        // which updates the DB and triggers Realtime to schedule the NEXT local timer.
    } catch (err) {
        console.error(`[HousieEngine] Auto-call failed for ${gameCode}:`, err);
    }
};

/**
 * Manages the in-memory timer for a specific game based on its latest state.
 */
export const manageGameTimer = (gameCode: string, gameData: any) => {
    const existing = gameEngines.get(gameCode);
    const targetTime = gameData.next_call_at || gameData.activation_at;

    // 1. Optimization: If already scheduled for this exact timestamp, skip
    if (existing?.scheduledFor && existing.scheduledFor === targetTime) {
        return;
    }

    // 2. Clear existing timer
    if (existing?.timer) {
        clearTimeout(existing.timer);
    }

    const version = (existing?.version || 0) + 1;
    const status = gameData.status;
    const settings = gameData.settings || {};
    const callingMode = settings.callingMode || 'manual';
    const isPaused = settings.isPaused || false;

    // 3. Handle 'starting' countdown
    if (status === 'starting' && gameData.activation_at) {
        const delay = Math.max(0, new Date(gameData.activation_at).getTime() - Date.now());

        const timer = setTimeout(async () => {
            const state = gameEngines.get(gameCode);
            if (!state || state.version !== version) return;
            await runActivation(gameCode);
        }, delay);

        gameEngines.set(gameCode, { timer, version, scheduledFor: gameData.activation_at });
    }
    // 4. Handle 'active' auto-calling
    else if (status === 'active' && callingMode === 'auto' && !isPaused) {
        if (gameData.next_call_at) {
            const delay = Math.max(0, new Date(gameData.next_call_at).getTime() - Date.now());

            const timer = setTimeout(async () => {
                const state = gameEngines.get(gameCode);
                if (!state || state.version !== version) return;
                await runAutoCall(gameCode);
            }, delay);

            gameEngines.set(gameCode, { timer, version, scheduledFor: gameData.next_call_at });
        }
        else {
            gameEngines.delete(gameCode);
        }
    }
    // 5. Cleanup for ended or manual/paused games
    else {
        gameEngines.delete(gameCode);
    }
};

/**
 * Initializes the reactive background engine.
 */
export const initHousieEngine = async () => {
    console.log('[HousieEngine] Initializing reactive in-memory engine...');

    // 1. Initial Sync: Fetch all non-ended games and initialize their timers
    const { data: activeGames } = await supabase
        .from('housie_games')
        .select('*')
        .in('status', ['starting', 'active']);

    if (activeGames) {
        console.log(`[HousieEngine] Bootstrapping ${activeGames.length} games...`);
        activeGames.forEach(game => manageGameTimer(game.game_code, game));
    }

    // 2. Realtime Monitor: minimalist UPDATE-only subscription
    supabase
        .channel('housie_engine_sync')
        .on('postgres_changes', {
            event: 'UPDATE',
            table: 'housie_games',
            schema: 'public'
        }, (payload) => {
            const gameData = payload.new as any;
            if (gameData && gameData.game_code) {
                // Whenever a game is updated (call scheduled, paused, status change), 
                // we re-evaluate its local timer.
                manageGameTimer(gameData.game_code, gameData);
            }
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('[HousieEngine] Reactive monitor subscribed (UPDATE only)');
            }
        });
};
