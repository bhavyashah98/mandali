import { useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../useSocket';
import { useSocketRoom } from '../useSocketRoom';

export const useHousieLobbySync = (groupId: string | undefined) => {
    const socket = useSocket();
    const queryClient = useQueryClient();

    const invalidate = useCallback(() => {
        if (groupId) {
            queryClient.invalidateQueries({ queryKey: ['activeHousieGame', groupId] });
        }
    }, [groupId, queryClient]);

    // useSocketRoom now handles both room joining and AppState-based sync
    useSocketRoom('join_group', groupId, invalidate);

    useEffect(() => {
        if (!groupId || !socket) return;

        socket.on('game_created', invalidate);
        socket.on('game_starting', invalidate);
        socket.on('game_activated', invalidate);
        socket.on('game_ended', invalidate);

        return () => {
            socket.off('game_created', invalidate);
            socket.off('game_starting', invalidate);
            socket.off('game_activated', invalidate);
            socket.off('game_ended', invalidate);
        };
    }, [groupId, socket, invalidate]);

    // Handle screen focus (navigation)
    useFocusEffect(
        useCallback(() => {
            invalidate();
        }, [invalidate])
    );
};
