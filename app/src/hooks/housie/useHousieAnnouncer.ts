import { useEffect } from 'react';
import { useHousieStore } from '../../stores/housieStore';
import { announceHousieNumber } from '../../utils/housieVoice';

/**
 * Hook to manage voice announcements of called numbers in Housie.
 * Uses global state to prevent duplicate announcements across screen transitions.
 */
export const useHousieAnnouncer = (game: any) => {
    const { lastAnnouncedNumber, setLastAnnouncedNumber } = useHousieStore();

    useEffect(() => {
        // If game is not active, reset the announcement tracker
        if (!game || game.status !== 'active') {
            if (lastAnnouncedNumber !== null) setLastAnnouncedNumber(null);
            return;
        }

        const numbers = game.called_numbers || [];
        const latest = numbers[numbers.length - 1];

        if (latest === undefined || latest === null) return;

        if (latest !== lastAnnouncedNumber) {
            const isFreshGame = numbers.length === 1;
            const wasAlreadyWatching = lastAnnouncedNumber !== null;

            if (isFreshGame || wasAlreadyWatching) {
                announceHousieNumber(latest);
            }

            // Sync the global tracker
            setLastAnnouncedNumber(latest);
        }
    }, [game?.called_numbers, game?.status, lastAnnouncedNumber, setLastAnnouncedNumber]);
};
