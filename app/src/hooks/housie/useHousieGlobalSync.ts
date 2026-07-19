import { useEffect } from 'react';
import { useSocket } from '../useSocket';
import { useHousieStore } from '../../stores/housieStore';
import { useQueryClient } from '@tanstack/react-query';

export const useHousieGlobalSync = () => {
    const { activeGameCode, addCalledNumber, setGameEnded, addClaimingPlayer, removeClaimingPlayer } = useHousieStore();
    const socket = useSocket();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!activeGameCode || !socket) return;

        console.log(`[HousieGlobalSync] 🔄 Starting sync for game: ${activeGameCode}`);

        const onNumberCalled = (data: any) => {
            const numbers = data.calledNumbers || [];
            const latest = numbers[numbers.length - 1];
            if (latest) {
                addCalledNumber(latest);
            }

            // Sync with React Query cache to keep UI consistent
            queryClient.setQueryData(['housieGame', activeGameCode], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    called_numbers: data.calledNumbers,
                    last_activity_at: data.lastActivityAt
                };
            });
        };

        const onGameEnded = () => {
            setGameEnded(true);
            // Optionally we don't reset immediately so the user can see the final state
        };

        const onPlayerClaimingOpen = ({ userId }: { userId?: string }) => {
            if (userId) addClaimingPlayer(userId);
        };

        const onPlayerClaimingClosed = ({ userId }: { userId?: string }) => {
            if (userId) removeClaimingPlayer(userId);
        };

        const onClaimResult = (data: any) => {
            if (data?.userId) removeClaimingPlayer(data.userId);
            queryClient.invalidateQueries({ queryKey: ['housieGame', activeGameCode] });
        };

        const onNewClaim = () => {
            queryClient.invalidateQueries({ queryKey: ['housieGame', activeGameCode] });
        };

        socket.on('number_called', onNumberCalled);
        socket.on('game_ended', onGameEnded);
        socket.on('player_claiming_open', onPlayerClaimingOpen);
        socket.on('player_claiming_closed', onPlayerClaimingClosed);
        socket.on('claim_result', onClaimResult);
        socket.on('new_claim', onNewClaim);

        return () => {
            console.log(`[HousieGlobalSync] 🛑 Stopping sync for game: ${activeGameCode}`);
            socket.off('number_called', onNumberCalled);
            socket.off('game_ended', onGameEnded);
            socket.off('player_claiming_open', onPlayerClaimingOpen);
            socket.off('player_claiming_closed', onPlayerClaimingClosed);
            socket.off('claim_result', onClaimResult);
            socket.off('new_claim', onNewClaim);
        };
    }, [activeGameCode, socket, queryClient]);
};
