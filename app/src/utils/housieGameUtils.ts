/**
 * Shared utility functions for Housie game modes (+1, -1, Reverse)
 */

export type GameStyle = 'classic' | 'plus_one' | 'minus_one' | 'reverse';

/**
 * Transforms a called number into the number a player is allowed to mark.
 */
export const transformHousieNumber = (n: number, mode: GameStyle | string): number => {
    if (mode === 'plus_one') return n + 1;
    if (mode === 'minus_one') return n - 1;
    if (mode === 'reverse') {
        const units = n % 10;
        const tens = Math.floor(n / 10);
        const rev = units * 10 + tens;
        return (rev >= 1 && rev <= 90) ? rev : -1;
    }
    return n;
};

/**
 * Gets all "markable" numbers based on the draw sequence and game mode.
 */
export const getEffectiveCalledNumbers = (called: number[], mode: GameStyle | string): number[] => {
    if (!called) return [];
    return called
        .map(n => transformHousieNumber(n, mode))
        .filter(n => n >= 1 && n <= 90);
};
