import { io } from '../index';
import { supabase } from '../lib/supabase';

interface GameTimer {
    timer: NodeJS.Timeout | null;
    autoCallSeconds: number;
    isPaused: boolean;
}

const gameTimers = new Map<string, GameTimer>();

/**
 * Start the automatic number calling sequence for a game.
 * First number has an extra 3 seconds delay.
 */
export const startAutoHost = async (gameCode: string, autoCallSeconds: number) => {
    console.log(`[AutoHost] Starting for ${gameCode} with ${autoCallSeconds}s interval`);
    
    // Cleanup any existing timer
    stopAutoHost(gameCode);

    gameTimers.set(gameCode, {
        timer: null,
        autoCallSeconds,
        isPaused: false
    });

    // First call delay: 3 seconds extra as requested
    const firstDelay = (autoCallSeconds + 3) * 1000;
    
    const timer = setTimeout(() => {
        executeCall(gameCode);
    }, firstDelay);

    const state = gameTimers.get(gameCode);
    if (state) state.timer = timer;
};

/**
 * Pause the automatic number calling.
 */
export const pauseAutoHost = (gameCode: string) => {
    console.log(`[AutoHost] Pausing for ${gameCode}`);
    const state = gameTimers.get(gameCode);
    if (state) {
        if (state.timer) clearTimeout(state.timer);
        state.timer = null;
        state.isPaused = true;
    }
};

/**
 * Resume the automatic number calling.
 * Ensures the auto-host loop is running if the game state warrants it.
 */
export const resumeAutoHost = async (gameCode: string) => {
    console.log(`[AutoHost] Resume requested for ${gameCode}`);
    await ensureAutoHostRunning(gameCode);
};

/**
 * Robust check to ensure auto-host is running if it should be.
 * Useful for recovering from server restarts or pause/resume glitches.
 */
export const ensureAutoHostRunning = async (gameCode: string) => {
    const state = gameTimers.get(gameCode);
    
    // If already running and not paused, do nothing
    if (state && !state.isPaused && state.timer) {
        return;
    }

    try {
        const { data: game } = await supabase
            .from('housie_games')
            .select('status, settings')
            .eq('game_code', gameCode)
            .single();

        if (!game || game.status !== 'active' || game.settings?.callingMode !== 'auto' || game.settings?.isPaused) {
            console.log(`[AutoHost] ensureAutoHostRunning: Conditions not met for ${gameCode}`);
            return;
        }

        const interval = game.settings?.autoCallSeconds || 7;
        
        if (state) {
            state.isPaused = false;
            state.autoCallSeconds = interval;
            if (state.timer) clearTimeout(state.timer);
        } else {
            gameTimers.set(gameCode, {
                timer: null,
                autoCallSeconds: interval,
                isPaused: false
            });
        }

        const nextTimer = setTimeout(() => {
            executeCall(gameCode);
        }, interval * 1000);

        const newState = gameTimers.get(gameCode);
        if (newState) newState.timer = nextTimer;
        
        console.log(`[AutoHost] Started/Resumed loop for ${gameCode}`);
    } catch (err) {
        console.error(`[AutoHost] Failed in ensureAutoHostRunning for ${gameCode}:`, err);
    }
};

export const stopAutoHost = (gameCode: string) => {
    const state = gameTimers.get(gameCode);
    if (state) {
        if (state.timer) clearTimeout(state.timer);
        gameTimers.delete(gameCode);
        console.log(`[AutoHost] Stopped for ${gameCode}`);
    }
};

/**
 * Reset the timer to start the full interval from now.
 * Used when a claim is resolved or closed.
 */
export const resetAutoHostTimer = (gameCode: string) => {
    const state = gameTimers.get(gameCode);
    if (state && !state.isPaused) {
        if (state.timer) clearTimeout(state.timer);
        console.log(`[AutoHost] Resetting timer for ${gameCode} to ${state.autoCallSeconds}s`);
        state.timer = setTimeout(() => {
            executeCall(gameCode);
        }, state.autoCallSeconds * 1000);
    }
};

/**
 * The core execution logic:
 * 1. Check if game is still active/unpaused
 * 2. Fetch game state from DB
 * 3. Draw next number from sequence
 * 4. Update DB
 * 5. Emit via Socket
 * 6. Schedule next call
 */
const executeCall = async (gameCode: string) => {
    const state = gameTimers.get(gameCode);
    if (!state || state.isPaused) return;

    try {
        // 1. Fetch game details
        const { data: game, error: fetchError } = await supabase
            .from('housie_games')
            .select('*')
            .eq('game_code', gameCode)
            .single();

        if (fetchError || !game) {
            console.error(`[AutoHost] Game ${gameCode} not found or error:`, fetchError);
            stopAutoHost(gameCode);
            return;
        }

        // 2. Stop if game is not active
        if (game.status !== 'active') {
            console.log(`[AutoHost] Game ${gameCode} status is ${game.status}, stopping auto-host.`);
            stopAutoHost(gameCode);
            return;
        }

        // 3. Stop if any claims are pending
        const winners = game.winners || {};
        const pending = winners['__pending'] || [];
        if (pending.length > 0) {
            console.log(`[AutoHost] Game ${gameCode} has pending claims, skipping this call.`);
            // Reschedule check in 2 seconds
            state.timer = setTimeout(() => executeCall(gameCode), 2000);
            return;
        }

        const calledNumbers = game.called_numbers || [];
        if (calledNumbers.length >= 90) {
            console.log(`[AutoHost] All numbers called for ${gameCode}.`);
            stopAutoHost(gameCode);
            return;
        }

        // 4. Draw next number
        const drawSequence: number[] = game.draw_sequence || [];
        const nextNumber = drawSequence[calledNumbers.length];
        const updatedNumbers = [...calledNumbers, nextNumber];

        // 5. Update Database
        const isLastNumber = updatedNumbers.length === 90;
        const { data: updatedGame, error: updateError } = await supabase
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

        // 6. Emit via Socket
        io.to(gameCode).emit('number_called', {
            gameCode,
            nextNumber,
            calledNumbers: updatedNumbers,
            calledCount: updatedNumbers.length,
            remainingCount: 90 - updatedNumbers.length,
            lastActivityAt: updatedGame.last_activity_at
        });

        if (isLastNumber) {
            io.to(gameCode).emit('game_ended', { gameCode, status: 'ended' });
            io.to(`group_${game.group_id}`).emit('game_created', { gameCode, status: 'ended' });
            stopAutoHost(gameCode);
            return;
        }

        // 7. Schedule next call
        state.timer = setTimeout(() => {
            executeCall(gameCode);
        }, state.autoCallSeconds * 1000);

    } catch (err) {
        console.error(`[AutoHost] Critical failure in executeCall for ${gameCode}:`, err);
        // Retry in 5 seconds
        state.timer = setTimeout(() => executeCall(gameCode), 5000);
    }
};
