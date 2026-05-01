import { supabase } from '../lib/supabase';
import { setNextCallTime } from './housieEngine';

/**
 * Start the automatic number calling sequence for a game.
 * Uses database-driven scheduling via next_call_at.
 */
export const startAutoHost = async (gameCode: string, autoCallSeconds: number) => {
    console.log(`[AutoHost] Starting for ${gameCode} with ${autoCallSeconds}s interval`);
    
    // First call delay: 3 seconds extra as requested
    await setNextCallTime(gameCode, autoCallSeconds + 3);
};

/**
 * Pause the automatic number calling by clearing the next scheduled call.
 */
export const pauseAutoHost = async (gameCode: string) => {
    console.log(`[AutoHost] Pausing for ${gameCode}`);
    await supabase
        .from('housie_games')
        .update({ next_call_at: null })
        .eq('game_code', gameCode);
};

/**
 * Resume the automatic number calling.
 */
export const resumeAutoHost = async (gameCode: string) => {
    console.log(`[AutoHost] Resume requested for ${gameCode}`);
    await ensureAutoHostRunning(gameCode);
};

/**
 * Robust check to ensure auto-host is running if it should be.
 */
export const ensureAutoHostRunning = async (gameCode: string) => {
    try {
        const { data: game } = await supabase
            .from('housie_games')
            .select('status, settings, next_call_at')
            .eq('game_code', gameCode)
            .single();

        if (!game || game.status !== 'active' || game.settings?.callingMode !== 'auto' || game.settings?.isPaused) {
            return;
        }

        // If no call is scheduled, schedule one now
        if (!game.next_call_at) {
            const interval = game.settings?.autoCallSeconds || 7;
            await setNextCallTime(gameCode, interval);
        }
    } catch (err) {
        console.error(`[AutoHost] Failed in ensureAutoHostRunning for ${gameCode}:`, err);
    }
};

/**
 * Stop the automatic number calling (e.g. game ended).
 */
export const stopAutoHost = async (gameCode: string) => {
    console.log(`[AutoHost] Stopping for ${gameCode}`);
    await supabase
        .from('housie_games')
        .update({ next_call_at: null })
        .eq('game_code', gameCode);
};

/**
 * Reset the timer to start the full interval from now.
 * Used when a claim is resolved or closed.
 */
export const resetAutoHostTimer = async (gameCode: string) => {
    try {
        const { data: game } = await supabase
            .from('housie_games')
            .select('status, settings, next_call_at')
            .eq('game_code', gameCode)
            .single();

        if (game && game.status === 'active' && game.settings?.callingMode === 'auto' && !game.settings?.isPaused) {
            const interval = game.settings?.autoCallSeconds || 7;
            console.log(`[AutoHost] Resetting timer for ${gameCode} to ${interval}s via DB`);
            await setNextCallTime(gameCode, interval);
        }
    } catch (err) {
        console.error(`[AutoHost] Failed to reset auto host timer for ${gameCode}:`, err);
    }
};
