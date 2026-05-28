import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';

export const useBlinkStartingSync = (
    gameCode: string,
    game: any,
    user: any,
    refetch: () => void,
    groupId?: string,
    planId?: string,
) => {
    const socket = useSocket();
    const queryClient = useQueryClient();
    const navigation = useNavigation<any>();

    // 1. Manage Socket Room & AppState Sync
    useSocketRoom('join_blink_game', gameCode, refetch);

    // 2. Navigation Focus Effect — refetch on every screen focus
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    // 3. Listen for blink_game_started — backend handles the delay and emits this
    useEffect(() => {
        if (!socket) return;

        const handleGameStarted = () => {
            // Update local cache optimistically then navigate
            queryClient.setQueryData(['blinkGame', gameCode], (old: any) => {
                if (!old) return old;
                return { ...old, game: { ...old.game, status: 'active' } };
            });
        };

        socket.on('blink_game_started', handleGameStarted);
        return () => {
            socket.off('blink_game_started', handleGameStarted);
        };
    }, [socket, gameCode, queryClient]);

    // 4. Single Source of Truth — navigate when game becomes active
    useEffect(() => {
        if (!game || game.status !== 'active') return;
        navigation.replace('BlinkGame', { gameCode, groupId, planId });
    }, [game?.status, gameCode, groupId, planId, navigation]);
};
