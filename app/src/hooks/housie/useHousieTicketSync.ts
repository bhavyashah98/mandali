import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';
import { resetSessionClaims } from '../../utils/housieValidator';

interface SyncProps {
    gameCode: string;
    userId?: string;
    groupId?: string;
    onClaimResult: (data: any) => void;
    onGameEnded: () => void;
    onPlayerClaimingOpen: () => void;
    onPlayerClaimingClosed: () => void;
}

export const useHousieTicketSync = ({
    gameCode,
    userId,
    groupId,
    onClaimResult,
    onGameEnded,
    onPlayerClaimingOpen,
    onPlayerClaimingClosed
}: SyncProps) => {
    const socket = useSocket();
    const queryClient = useQueryClient();

    // 1. AppState/Socket Room Management (Handles Background -> Foreground)
    useSocketRoom('join_game', gameCode, () => {
        // Force refetch on reconnection/foreground to ensure we didn't miss numbers
        queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        queryClient.invalidateQueries({ queryKey: ['housieTickets', gameCode] });
    });

    // 2. Navigation Focus Management (Handles Screen -> Screen navigation)
    useFocusEffect(
        useCallback(() => {
            if (gameCode) {
                queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
                queryClient.invalidateQueries({ queryKey: ['housieTickets', gameCode] });
            }
        }, [gameCode, queryClient])
    );

    useEffect(() => {
        if (!gameCode || gameCode.length < 6 || !socket) return;

        const onNumberCalled = (data: any) => {
            // Voice announcement is now handled reactively in the Screen component
            // to be resilient against backgrounding/missed socket events.
            
            queryClient.setQueryData(['housieGame', gameCode], (old: any) => ({
                ...old,
                called_numbers: data.calledNumbers,
                calledCount: data.calledCount,
                remainingCount: data.remainingCount,
                last_activity_at: data.lastActivityAt
            }));
        };

        const onClaimResultWrapped = (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
            onClaimResult(data);
        };

        const onTicketsBought = () => {
            queryClient.invalidateQueries({ queryKey: ['housieParticipants', gameCode] });
            queryClient.invalidateQueries({ queryKey: ['housieTickets', gameCode] });
        };

        const onGameStarting = () => {
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        };

        const onGameActivated = () => {
            resetSessionClaims();
            queryClient.invalidateQueries({ queryKey: ['housieGame', gameCode] });
        };

        const onGamePaused = () => {
            queryClient.setQueryData(['housieGame', gameCode], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    settings: { ...old.settings, isPaused: true }
                };
            });
        };

        const onGameResumed = () => {
            queryClient.setQueryData(['housieGame', gameCode], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    settings: { ...old.settings, isPaused: false }
                };
            });
        };

        socket.on('number_called', onNumberCalled);
        socket.on('claim_result', onClaimResultWrapped);
        socket.on('tickets_bought', onTicketsBought);
        socket.on('game_ended', onGameEnded);
        socket.on('game_starting', onGameStarting);
        socket.on('game_activated', onGameActivated);
        socket.on('player_claiming_open', onPlayerClaimingOpen);
        socket.on('player_claiming_closed', onPlayerClaimingClosed);
        socket.on('game_paused', onGamePaused);
        socket.on('game_resumed', onGameResumed);

        return () => {
            socket.off('number_called', onNumberCalled);
            socket.off('claim_result', onClaimResultWrapped);
            socket.off('tickets_bought', onTicketsBought);
            socket.off('game_ended', onGameEnded);
            socket.off('game_starting', onGameStarting);
            socket.off('game_activated', onGameActivated);
            socket.off('player_claiming_open', onPlayerClaimingOpen);
            socket.off('player_claiming_closed', onPlayerClaimingClosed);
            socket.off('game_paused', onGamePaused);
            socket.off('game_resumed', onGameResumed);
        };
    }, [gameCode, userId, socket, queryClient, onClaimResult, onGameEnded, onPlayerClaimingOpen, onPlayerClaimingClosed]);
};
