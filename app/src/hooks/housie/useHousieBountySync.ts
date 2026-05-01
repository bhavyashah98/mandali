import { useEffect } from 'react';
import { useSocket } from '../useSocket';

interface UseHousieBountySyncProps {
    gameCode: string;
    onTicketsBought: () => void;
}

export const useHousieBountySync = ({ gameCode, onTicketsBought }: UseHousieBountySyncProps) => {
    const socket = useSocket();

    useEffect(() => {
        if (!socket || !gameCode) return;

        // When someone buys tickets, we need to refresh stats to update the prize pool
        socket.on('tickets_bought', onTicketsBought);

        return () => {
            socket.off('tickets_bought', onTicketsBought);
        };
    }, [gameCode, socket, onTicketsBought]);
};
