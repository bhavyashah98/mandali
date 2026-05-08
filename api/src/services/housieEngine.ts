import { supabase } from '../lib/supabase';
import { io } from '../index';
import { sendGroupPushNotification } from '../lib/push';

/**
 * BULLETPROOF TICKER ENGINE (Production Optimized)
 */

let workerInterval: NodeJS.Timeout | null = null;
let lastStallCheck = 0;
const activeTimers = new Map<string, NodeJS.Timeout>();
const reminderTimers = new Map<string, NodeJS.Timeout>();

const log = (gameCode: string, message: string) => {
    const istTimestamp = new Date().toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        hour12: false
    });
    console.log(`[HousieEngine] [${istTimestamp}] [${gameCode}] ${message}`);
};

const logError = (gameCode: string, message: string, err?: any) => {
    const timestamp = new Date().toISOString();
    console.error(`[HousieEngine] [ERROR] [${timestamp}] [${gameCode}] ${message}`, err);
};

/**
 * Cancels any existing timers for a game.
 */
export const cancelScheduledGame = (gameCode: string) => {
    if (activeTimers.has(gameCode)) {
        clearTimeout(activeTimers.get(gameCode));
        activeTimers.delete(gameCode);
        log(gameCode, "Cleared active start timer.");
    }
    if (reminderTimers.has(gameCode)) {
        clearTimeout(reminderTimers.get(gameCode));
        reminderTimers.delete(gameCode);
        log(gameCode, "Cleared reminder timer.");
    }
};

/**
 * Transitions a game from 'scheduled' to 'starting'.
 */
export const transitionGameToStarting = async (gameCode: string, groupId: string, hostId: string) => {
    try {
        log(gameCode, `Transitioning from Scheduled to Starting.`);
        
        // 1. Fetch current game state
        const { data: game, error: fetchError } = await supabase
            .from('housie_games')
            .select('id, ticket_price, prizes, title')
            .eq('game_code', gameCode)
            .single();
            
        if (fetchError || !game) {
            logError(gameCode, `Transition failed: Game not found.`, fetchError);
            return;
        }

        // 2. Count tickets bought to calculate prize pool
        const { count: ticketCount } = await supabase
            .from('housie_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('game_id', game.id);

        const ticketPrice = game.ticket_price || 100;
        const totalPrizePool = (ticketCount || 0) * ticketPrice;

        log(gameCode, `Calculating prizes: Tickets: ${ticketCount}, Pool: ${totalPrizePool}`);

        // 3. Calculate final prize amounts based on percentages
        const calculatedPrizes = (game.prizes || []).map((p: any) => ({
            ...p,
            amount: Math.floor((totalPrizePool * (p.percentage || 0)) / 100)
        }));

        // 4. Update game to 'starting' and save prizes
        const { data: updated, error } = await supabase
            .from('housie_games')
            .update({ 
                status: 'starting', 
                prizes: calculatedPrizes,
                activation_at: new Date(Date.now() + 60000).toISOString(),
                last_activity_at: new Date().toISOString() 
            })
            .eq('game_code', gameCode)
            .eq('status', 'scheduled')
            .select()
            .single();

        if (error || !updated) {
            logError(gameCode, `Transition failed (Already started or updated?).`, error);
            return;
        }

        // 5. Socket Notification
        io?.to(`group_${groupId}`).emit('game_opened', { 
            gameCode: gameCode, 
            title: updated.title || 'New Game' 
        });

        io?.to(gameCode).emit('game_starting', {
            gameCode: gameCode,
            status: 'starting'
        });

        // 6. Push Notification
        sendGroupPushNotification(
            groupId,
            hostId,
            '🎟️ Game Starting!',
            `The Housie game "${updated.title || 'Housie'}" is starting now. Jump in to play!`,
            { type: 'housie', gameCode, groupId, url: `mandali://housie/${gameCode}/${groupId}` }
        ).catch(err => logError(gameCode, 'Failed to send start notification', err));

        debouncedCheck();
        cancelScheduledGame(gameCode);
        
    } catch (err) {
        logError(gameCode, `Error in transitionGameToStarting`, err);
    }
};

/**
 * Schedules a game to move from 'scheduled' to 'starting' at the right time.
 * This handles the memory-based timer for the exact second, while the ticker
 * provides a fallback safety net.
 */
export const scheduleGameStart = (gameCode: string, scheduledAt: string, groupId: string, hostId: string, title?: string) => {
    if (!scheduledAt) return;

    cancelScheduledGame(gameCode);

    const startTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    const delay = Math.max(0, startTime - now);

    log(gameCode, `Scheduled start in ${Math.round(delay / 1000 / 60)} mins (UTC: ${scheduledAt}).`);

    // 1. Reminder Timer
    const fiveMinInMs = 5 * 60 * 1000;
    const reminderDelay = Math.max(0, delay - fiveMinInMs);

    if (delay > 30000) {
        const rTimer = setTimeout(async () => {
            log(gameCode, `Sending pre-game reminder.`);
            sendGroupPushNotification(
                groupId,
                hostId,
                delay > (fiveMinInMs + 10000) ? '🕒 5 Minutes Left!' : '🎟️ Game Starting Soon!',
                `The Housie game "${title || 'Housie'}" is starting ${delay > (fiveMinInMs + 10000) ? 'in 5 minutes' : 'very soon'}. Join now!`,
                { type: 'housie', gameCode, groupId }
            ).catch(err => logError(gameCode, 'Failed to send reminder', err));
            reminderTimers.delete(gameCode);
        }, reminderDelay);
        reminderTimers.set(gameCode, rTimer);
    }

    // 2. Exact Start Timer
    const timer = setTimeout(() => {
        transitionGameToStarting(gameCode, groupId, hostId);
    }, delay);

    activeTimers.set(gameCode, timer);
};

/**
 * Simple Debounce Helper
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
export const setNextCallTime = async (gameCode: string, seconds: number) => {
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
            log(gameCode, `Game reached 90 numbers. Ending.`);
            await supabase
                .from('housie_games')
                .update({ status: 'ended', last_activity_at: new Date().toISOString() })
                .eq('game_code', gameCode);

            io?.to(gameCode).emit('game_ended', { gameCode, status: 'ended' });
            return;
        }

        if (game.winners?.['__pending']?.length > 0) {
            log(gameCode, `Pending claims. Postponing draw.`);
            return setNextCallTime(gameCode, 2);
        }

        const nextNumber = sequence[called.length];
        if (nextNumber === undefined || nextNumber === null) {
            logError(gameCode, `Draw sequence error (index ${called.length}). Retrying.`);
            return setNextCallTime(gameCode, 5);
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

        await setNextCallTime(gameCode, interval);
        log(gameCode, `Called number ${nextNumber} (Total: ${updatedNumbers.length})`);

    } catch (err) {
        logError(gameCode, `Execution failure`, err);
        await setNextCallTime(gameCode, 5);
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


        // 1. PROCESS AUTO-CALLS (Active)
        // Only fetch games that are set to 'auto' calling mode
        const { data: gamesToCall, error: callError } = await supabase
            .from('housie_games')
            .update({ next_call_at: null })
            .eq('status', 'active')
            .eq('settings->>callingMode', 'auto')
            .lte('next_call_at', lockWindow)
            .select();

        if (callError) throw callError;
        if (gamesToCall?.length) {
            log('SYSTEM', `Handling ${gamesToCall.length} auto-calls.`);
            await Promise.all(gamesToCall.map(game => processGameCall(game)));
        }

        // 2. PROCESS SCHEDULED GAMES (Scheduled -> Starting)
        // Proactive check for games that reached their start time (fallback for setTimeout)
        const { data: gamesToStart, error: startError } = await supabase
            .from('housie_games')
            .select('game_code, group_id, host_id')
            .eq('status', 'scheduled')
            .lte('scheduled_at', nowIso);

        if (startError) throw startError;
        if (gamesToStart?.length) {
            log('SYSTEM', `Found ${gamesToStart.length} missed scheduled starts. Transitioning...`);
            for (const g of gamesToStart) {
                await transitionGameToStarting(g.game_code, g.group_id, g.host_id);
            }
        }

        // 3. PROCESS ACTIVATIONS (Starting -> Active)
        const { data: gamesToActivate, error: activateError } = await supabase
            .from('housie_games')
            .update({ status: 'active', last_activity_at: nowIso })
            .eq('status', 'starting')
            .lte('activation_at', nowIso)
            .select();

        if (activateError) throw activateError;
        if (gamesToActivate?.length) {
            log('SYSTEM', `Activating ${gamesToActivate.length} games.`);
            for (const g of gamesToActivate) {
                io?.to(g.game_code).emit('game_activated', { gameCode: g.game_code, status: 'active', game: g });
                if (g.settings?.callingMode === 'auto' && !g.settings?.isPaused) {
                    await setNextCallTime(g.game_code, (g.settings?.autoCallSeconds || 7) + 2);
                }
            }
        }

        // 3. STALL RECOVERY (Self-Healing)
        if (Date.now() - lastStallCheck > 30000) {
            lastStallCheck = Date.now();
            const { data: stalledGames } = await supabase
                .from('housie_games')
                .select('game_code, settings, winners')
                .eq('status', 'active')
                .is('next_call_at', null);

            if (stalledGames?.length) {
                for (const g of stalledGames) {
                    const winners = g.winners || {};
                    const pending = winners['__pending'] || [];
                    const isPaused = g.settings?.isPaused || false;
                    if (pending.length === 0 && !isPaused) {
                        log(g.game_code, "RECOVERY: restarting stalled timer.");
                        await setNextCallTime(g.game_code, 5);
                    }
                }
            }
        }

    } catch (err) {
        logError('SYSTEM', `Worker tick failure`, err);
    }
}

/**
 * Manages the Ticker lifecycle (Wake/Sleep)
 */
export async function checkEngineStatus() {
    try {
        const { data, error } = await supabase
            .from('housie_games')
            .select('status, settings')
            .in('status', ['starting', 'active']);

        if (error) throw error;

        // Ticker should run if:
        // 1. There are games in 'starting' status (need to transition to active)
        // 2. There are active games with 'auto' calling mode
        const shouldRun = (data || []).some(g => 
            g.status === 'starting' || 
            (g.status === 'active' && g.settings?.callingMode === 'auto')
        );

        if (shouldRun && !workerInterval) {
            log('SYSTEM', `Ticker WAKE-UP (${data?.length || 0} active).`);
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

const debouncedCheck = debounce(() => checkEngineStatus(), 2000);

/**
 * Initialization
 */
export const initHousieEngine = async () => {
    log('SYSTEM', 'Initializing Production Housie Engine...');

    // 1. Sync all scheduled games into memory timeouts
    const { data: scheduled } = await supabase
        .from('housie_games')
        .select('game_code, scheduled_at, group_id, host_id, title')
        .eq('status', 'scheduled');
    
    if (scheduled) {
        scheduled.forEach(g => scheduleGameStart(g.game_code, g.scheduled_at, g.group_id, g.host_id, g.title));
    }

    // 2. Perform initial engine status check
    checkEngineStatus();

    // 3. Monitor for status changes
    supabase
        .channel('housie_engine_monitor')
        .on('postgres_changes',
            { event: '*', table: 'housie_games', schema: 'public' },
            (payload) => {
                const game = payload.new as any;
                const status = game?.status;
                const oldStatus = (payload.old as any)?.status;
                log('SYSTEM', `Monitor: [${payload.eventType}] game ${game?.game_code || (payload.old as any)?.game_code} (status: ${status}, oldStatus: ${oldStatus})`);
                
                const gameCode = game?.game_code || (payload.old as any)?.game_code;

                // 1. Handle DELETION
                if (payload.eventType === 'DELETE' && gameCode) {
                    log(gameCode, `Monitor: Game deleted, clearing timers.`);
                    cancelScheduledGame(gameCode);
                    return;
                }

                // 2. Handle Status changes (if game is no longer scheduled)
                if (payload.eventType === 'UPDATE' && oldStatus === 'scheduled' && status !== 'scheduled' && status !== 'starting') {
                    log(gameCode, `Monitor: Game no longer scheduled (status: ${status}), clearing timers.`);
                    cancelScheduledGame(gameCode);
                }

                // 3. If a game becomes scheduled (either created or updated to scheduled)
                if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && status === 'scheduled') {
                    log(gameCode, `Monitor: Tracking scheduled game.`);
                    scheduleGameStart(gameCode, game.scheduled_at, game.group_id, game.host_id, game.title);
                }

                if (['starting', 'active', 'ended'].includes(status)) {
                    debouncedCheck();
                }
            }
        )
        .subscribe();
};
