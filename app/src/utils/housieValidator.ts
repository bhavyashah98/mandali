/**
 * Housie Claim Validator
 * Helps prevent duplicate or invalid claim attempts.
 */

export interface HousieClaim {
    ticketId: string;
    prizeId: string;
    claimedOnNumber: number;
    claimedOnIndex: number;
}

/**
 * Tracks claims made in the current session to prevent double-claiming 
 * before the UI/Server has a chance to update.
 */
let sessionClaims: HousieClaim[] = [];

/**
 * Validates if a claim can be made based on local session history.
 * Rules:
 * 1. Cannot claim the SAME prize with the SAME ticket on the SAME number twice.
 */
export const canClaimPrize = (
    ticketId: string, 
    prizeId: string, 
    currentNumber: number,
    currentNumberIndex: number,
    existingDeniedClaims?: Record<string, string[]> // [ticketId]: [prizeId, prizeId...]
): { canClaim: boolean; reason?: string } => {
    
    // 1. Check if this specific combo has already been attempted in this session
    const alreadyAttempted = sessionClaims.some(c => 
        c.ticketId === ticketId && 
        c.prizeId === prizeId && 
        c.claimedOnNumber === currentNumber
    );

    if (alreadyAttempted) {
        return { 
            canClaim: false, 
            reason: "You have already claimed this prize on this number." 
        };
    }

    // 2. Check if this ticket has already been marked as "Boggy" for this prize
    if (existingDeniedClaims && existingDeniedClaims[ticketId]?.includes(prizeId)) {
        return {
            canClaim: false,
            reason: "This claim was previously rejected as Boggy."
        };
    }

    return { canClaim: true };
};

/**
 * Registers a successful claim attempt in the session.
 */
export const registerSessionClaim = (claim: HousieClaim) => {
    sessionClaims.push(claim);
};

/**
 * Clears session history (useful when starting a new game)
 */
export const resetSessionClaims = () => {
    sessionClaims = [];
};
