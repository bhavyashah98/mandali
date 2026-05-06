import { create } from 'zustand';
import { announceHousieNumber } from '../utils/housieVoice';

interface HousieState {
    activeGameCode: string | null;
    calledNumbers: number[];
    isGameEnded: boolean;
    claimingPlayers: Set<string>;
    
    // Actions
    setActiveGame: (gameCode: string | null) => void;
    setCalledNumbers: (numbers: number[]) => void;
    addCalledNumber: (num: number) => void;
    setGameEnded: (ended: boolean) => void;
    addClaimingPlayer: (userId: string) => void;
    removeClaimingPlayer: (userId: string) => void;
    lastAnnouncedNumber: number | null;
    setLastAnnouncedNumber: (num: number | null) => void;
    reset: () => void;
}


export const useHousieStore = create<HousieState>((set) => ({
    activeGameCode: null,
    calledNumbers: [],
    isGameEnded: false,
    claimingPlayers: new Set(),
    lastAnnouncedNumber: null,


    setActiveGame: (gameCode) => set({ activeGameCode: gameCode }),
    setCalledNumbers: (numbers) => set({ calledNumbers: numbers }),
    addCalledNumber: (num) => set((state) => {
        // Prevent duplicates
        if (state.calledNumbers.includes(num)) return state;
        
        return { calledNumbers: [...state.calledNumbers, num] };
    }),

    setGameEnded: (ended) => set({ isGameEnded: ended }),
    addClaimingPlayer: (userId) => set((state) => {
        const next = new Set(state.claimingPlayers);
        next.add(userId);
        return { claimingPlayers: next };
    }),
    removeClaimingPlayer: (userId) => set((state) => {
        const next = new Set(state.claimingPlayers);
        next.delete(userId);
        return { claimingPlayers: next };
    }),
    setLastAnnouncedNumber: (num) => set({ lastAnnouncedNumber: num }),
    reset: () => set({ 
        activeGameCode: null, 
        calledNumbers: [], 
        isGameEnded: false, 
        claimingPlayers: new Set(),
        lastAnnouncedNumber: null
    }),

}));
