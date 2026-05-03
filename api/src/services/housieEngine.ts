import { supabase } from '../lib/supabase';
import { io } from '../index';

/**
 * BULLETPROOF TICKER ENGINE (Production Optimized)
 * A stateless, self-healing worker for Housie.
 */

let workerInterval: NodeJS.Timeout | null = null;
let lastStallCheck = 0;

const log = (gameCode: string, message: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[HousieEngine] [${timestamp}] [${gameCode}] ${message}`);
};

const logError = (gameCode: string, message: string, err?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[HousieEngine] [ERROR] [${timestamp}] [${gameCode}] ${message}`, err);
};

/**
 * Simple Debounce Helper to prevent hammering the DB during rapid updates.
 */
function debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Updates the database with the next scheduled call time.
 */
const setNextCallInDb = async (gameCode: string, seconds: number) => {
    try {
        const nextTime = new Date(Date.now() + seconds * 1000).toISOString();
        const { error } = await supabase
            .from('housie_games')
            .update({
                next_call_at: nextTime,
                last_activity_at: new Date().toISOString()
            })
            .eq('game_code', gameCode);

        if (error) throw error;
    } catch (err) {
        logError(gameCode, `Failed to update next_call_at`, err);
    }
};

/**
 * Executes the logic for drawing a number.
 */
async function processGameCall(game: any) {
    const gameCode = game.game_code;
    try {
        const called = game.called_numbers || [];
        const sequence = game.draw_sequence || [];
        const interval = game.settings?.autoCallSeconds || 7;

        if (called.length >= 90) {
            log(gameCode, `Game reached 90 numbers. Ending game.`);
            await supabase
                .from('housie_games')
                .update({ status: 'ended', last_activity_at: new Date().toISOString() })
                .eq('game_code', gameCode);

            io?.to(gameCode).emit('game_ended', { gameCode, status: 'ended' });
            return;
        }

        if (game.winners?.['__pending']?.length > 0) {
            log(gameCode, `Pending claims detected. Postponing draw.`);
            return setNextCallInDb(gameCode, 2);
        }

        const nextNumber = sequence[called.length];
        if (nextNumber === undefined || nextNumber === null) {
            logError(gameCode, `Draw sequence error. Retrying.`);
            return setNextCallInDb(gameCode, 5);
        }

        const updatedNumbers = [...called, nextNumber];

        const { data: updateData, error: updateError } = await supabase
            .from('housie_games')
            .update({
                called_numbers: updatedNumbers,
                last_activity_at: new Date().toISOString()
            })
            .eq('game_code', gameCode)
            .select();

        if (updateError || !updateData?.length) throw new Error('DB Update failed');

        io?.to(gameCode).emit('number_called', {
            gameCode,
            nextNumber,
            calledNumbers: updatedNumbers,
            calledCount: updatedNumbers.length
        });

        await setNextCallInDb(gameCode, interval);
        log(gameCode, `Called number ${nextNumber}`);

    } catch (err) {
        logError(gameCode, `Execution failure`, err);
        await setNextCallInDb(gameCode, 5);
    }
}

/**
 * The 1-second worker tick.
 */
async function tick() {
    try {
        const now = new Date();
        const nowIso = now.toISOString();
        const lockWindow = new Date(now.getTime() + 1000).toISOString();

        // 1. PROCESS AUTO-CALLS (Atomic Lock & Fetch)
        const { data: gamesToCall, error: callError } = await supabase
            .from('housie_games')
            .update({ next_call_at: null })
            .eq('status', 'active')
            .lte('next_call_at', lockWindow)
            .select();

        if (callError) throw callError;

        if (gamesToCall?.length) {
            log('SYSTEM', `Tick: Handling ${gamesToCall.length} auto-calls.`);
            await Promise.all(gamesToCall.map(game => processGameCall(game)));
        }

        // 2. PROCESS ACTIVATIONS
        const { data: gamesToActivate, error: activateError } = await supabase
            .from('housie_games')
            .update({ status: 'active', last_activity_at: nowIso })
            .eq('status', 'starting')
            .lte('activation_at', nowIso)
            .select();

        if (activateError) throw activateError;

        if (gamesToActivate?.length) {
            log('SYSTEM', `Tick: Activating ${gamesToActivate.length} games.`);
            for (const g of gamesToActivate) {
                io?.to(g.game_code).emit('game_activated', { gameCode: g.game_code, status: 'active', game: g });
                if (g.settings?.callingMode === 'auto' && !g.settings?.isPaused) {
                    await setNextCallInDb(g.game_code, (g.settings?.autoCallSeconds || 7) + 2);
                }
            }
        }

        // 3. STALL RECOVERY
        if (Date.now() - lastStallCheck > 30000) {
            lastStallCheck = Date.now();
            const staleTime = new Date(Date.now() - 30000).toISOString();

            const { data: stalledGames } = await supabase
                .from('housie_games')
                .select('*')
                .eq('status', 'active')
                .is('next_call_at', null)
                .lte('last_activity_at', staleTime);

            if (stalledGames && stalledGames.length > 0) {
                log('SYSTEM', `Stall Recovery: Kick-starting ${stalledGames.length} stuck games.`);
                stalledGames.forEach(g => setNextCallInDb(g.game_code, 2));
            }
        }

    } catch (err) {
        logError('SYSTEM', `Worker tick failure`, err);
    }
}

/**
 * Manages the Ticker lifecycle (Wake/Sleep)
 */
async function checkEngineStatus() {
    try {
        const { count, error } = await supabase
            .from('housie_games')
            .select('*', { count: 'exact', head: true })
            .in('status', ['starting', 'active']);

        if (error) throw error;

        const shouldRun = (count || 0) > 0;

        if (shouldRun && !workerInterval) {
            log('SYSTEM', `Ticker WAKE-UP (${count} active).`);
            workerInterval = setInterval(tick, 1000);
        } else if (!shouldRun && workerInterval) {
            log('SYSTEM', `Ticker HIBERNATION.`);
            clearInterval(workerInterval);
            workerInterval = null;
        }
    } catch (err) {
        logError('SYSTEM', `Status check failure`, err);
    }
}

// Debounced check for production noise reduction
const debouncedCheck = debounce(() => checkEngineStatus(), 2000);

/**
 * Initialization
 */
export const initHousieEngine = () => {
    log('SYSTEM', 'Initializing Optimized Ticker Engine...');

    checkEngineStatus();

    // Monitor for status changes only to save Egress/CPU
    supabase
        .channel('housie_engine_monitor')
        .on('postgres_changes',
            { event: 'UPDATE', table: 'housie_games', schema: 'public' },
            (payload) => {
                const status = (payload.new as any)?.status;
                if (['starting', 'active', 'ended'].includes(status)) {
                    debouncedCheck();
                }
            }
        )
        .subscribe();
};
